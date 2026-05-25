jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { InternalVisualizationJobEventFacade } from './internal-visualization-job-event.facade';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import { JobEventCallbackReqDTO, JobEventType } from '../dtos/internal-visualization-job-event.dto';
import { VisualizationJobStatus } from 'src/modules/visualization/domain/enums/visualization-job-status.enum';
import { VisualizationSlideStatus } from 'src/modules/visualization/domain/enums/visualization-slide-status.enum';
import { PipelineStage } from 'src/modules/visualization/domain/enums/pipeline-stage.enum';
import { VisualizationJob } from 'src/modules/visualization/domain/visualization-job.entity';
import { VisualizationSlide } from 'src/modules/visualization/domain/visualization-slide.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const GCS_PPTX_KEY = 'jobs/test/current.pptx';

function makeJob(overrides: Partial<VisualizationJob> = {}): VisualizationJob {
    return {
        id: JOB_ID,
        status: VisualizationJobStatus.COMPLETED,
        pipelineStage: PipelineStage.COMPLETED,
        totalSlides: 2,
        gcsPptxKey: GCS_PPTX_KEY,
        slidePlan: null,
        regenerationCount: 0,
        ...overrides,
    } as VisualizationJob;
}

function makeSlide(
    slideOrder: number,
    status: VisualizationSlideStatus = VisualizationSlideStatus.COMPLETED
): VisualizationSlide {
    return { id: `slide-${slideOrder}`, slideOrder, status } as VisualizationSlide;
}

function makeBody(overrides: Partial<JobEventCallbackReqDTO>): JobEventCallbackReqDTO {
    return {
        event: JobEventType.PIPELINE_STAGE_CHANGED,
        idempotencyKey: 'key-1',
        occurredAt: '2026-05-25T00:00:00Z',
        schemaVersion: 1,
        ...overrides,
    };
}

describe('InternalVisualizationJobEventFacade', () => {
    let facade: InternalVisualizationJobEventFacade;

    let findByIdOrThrow: jest.Mock;
    let updatePipelineStage: jest.Mock;
    let finalizeFromPipeline: jest.Mock;
    let findAllByJobId: jest.Mock;

    beforeEach(() => {
        findByIdOrThrow = jest.fn().mockResolvedValue(makeJob());
        updatePipelineStage = jest.fn();
        finalizeFromPipeline = jest.fn();
        findAllByJobId = jest.fn().mockResolvedValue([makeSlide(1), makeSlide(2)]);

        const vizJobService = {
            findByIdOrThrow,
            updatePipelineStage,
            finalizeFromPipeline,
            isPartialError: jest.fn(),
            finalizeToCompleted: jest.fn(),
            decrementRegenerationCount: jest.fn(),
            updateSlidePlan: jest.fn(),
        } as unknown as VisualizationJobService;

        const vizSlideService = {
            findAllByJobId,
            findByIdAndJobIdOrThrow: jest.fn(),
            applyEventUpdate: jest.fn(),
            hasNonCompletedSlides: jest.fn(),
            bulkInsert: jest.fn(),
        } as unknown as VisualizationSlideService;

        facade = new InternalVisualizationJobEventFacade(vizJobService, vizSlideService);
    });

    describe('pipeline_stage_changed', () => {
        it('pipelineStage를 갱신한다', async () => {
            const body = makeBody({
                event: JobEventType.PIPELINE_STAGE_CHANGED,
                pipelineStage: PipelineStage.RENDERING,
            });

            await facade.processDbOperations(JOB_ID, body);

            expect(updatePipelineStage).toHaveBeenCalledWith(JOB_ID, PipelineStage.RENDERING);
        });

        it('finalizeFromPipeline을 호출하지 않는다', async () => {
            const body = makeBody({
                event: JobEventType.PIPELINE_STAGE_CHANGED,
                pipelineStage: PipelineStage.RENDERING,
            });

            await facade.processDbOperations(JOB_ID, body);

            expect(finalizeFromPipeline).not.toHaveBeenCalled();
        });

        it('null을 반환한다 (canExport 불필요)', async () => {
            const body = makeBody({
                event: JobEventType.PIPELINE_STAGE_CHANGED,
                pipelineStage: PipelineStage.RENDERING,
            });

            const result = await facade.processDbOperations(JOB_ID, body);

            expect(result).toBeNull();
        });
    });

    describe('all_completed', () => {
        describe('status 결정', () => {
            it('errorCode 없고 failed=0이면 COMPLETED로 finalize한다', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 7, failed: 0 },
                });

                await facade.processDbOperations(JOB_ID, body);

                expect(finalizeFromPipeline).toHaveBeenCalledWith(JOB_ID, {
                    status: VisualizationJobStatus.COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                });
            });

            it('failed>0이면 PARTIAL_ERROR로 finalize한다', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 6, failed: 1 },
                });

                await facade.processDbOperations(JOB_ID, body);

                expect(finalizeFromPipeline).toHaveBeenCalledWith(JOB_ID, {
                    status: VisualizationJobStatus.PARTIAL_ERROR,
                    gcsPptxKey: GCS_PPTX_KEY,
                });
            });

            it('summary.completed === 0이면 ERROR로 finalize한다 (errorCode 포함 케이스)', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    errorCode: 'TEMPLATE_FETCH_FAILED',
                    summary: { completed: 0, failed: 7 },
                });

                await facade.processDbOperations(JOB_ID, body);

                expect(finalizeFromPipeline).toHaveBeenCalledWith(JOB_ID, {
                    status: VisualizationJobStatus.ERROR,
                    gcsPptxKey: null,
                });
            });

            it('errorCode 없이 completed=0, failed>0이어도 ERROR로 finalize한다', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 0, failed: 3 },
                });

                await facade.processDbOperations(JOB_ID, body);

                expect(finalizeFromPipeline).toHaveBeenCalledWith(JOB_ID, {
                    status: VisualizationJobStatus.ERROR,
                    gcsPptxKey: GCS_PPTX_KEY,
                });
            });
        });

        describe('computeCanExport', () => {
            it('모든 슬라이드가 completed이고 gcsPptxKey가 있으면 canExport=true를 반환한다', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 2, failed: 0 },
                });

                const result = await facade.processDbOperations(JOB_ID, body);

                expect(result).toMatchObject({ canExport: true, blockingSlides: [] });
            });

            it('blocking 슬라이드가 있으면 canExport=false를 반환한다', async () => {
                findByIdOrThrow.mockResolvedValue(makeJob());
                findAllByJobId.mockResolvedValue([
                    makeSlide(1, VisualizationSlideStatus.COMPLETED),
                    makeSlide(2, VisualizationSlideStatus.ERROR),
                ]);
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 1, failed: 1 },
                });

                const result = await facade.processDbOperations(JOB_ID, body);

                expect(result).toMatchObject({
                    canExport: false,
                    blockingSlides: [2],
                });
            });

            it('gcsPptxKey가 없으면 canExport=false이고 _pptx 사유를 포함한다', async () => {
                findByIdOrThrow.mockResolvedValue(makeJob({ gcsPptxKey: null }));
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    errorCode: 'TEMPLATE_FETCH_FAILED',
                    summary: { completed: 0, failed: 2 },
                });

                const result = await facade.processDbOperations(JOB_ID, body);

                expect(result?.canExport).toBe(false);
                expect(result?.blockingReasons['_pptx']).toBe('missing_current_pptx');
            });

            it('all_completed 이후 슬라이드 전체 조회를 수행한다', async () => {
                const body = makeBody({
                    event: JobEventType.ALL_COMPLETED,
                    gcsPptxKey: GCS_PPTX_KEY,
                    summary: { completed: 2, failed: 0 },
                });

                await facade.processDbOperations(JOB_ID, body);

                expect(findAllByJobId).toHaveBeenCalledWith(JOB_ID);
            });
        });

        it('pipeline_stage_changed에서는 슬라이드 조회를 하지 않는다', async () => {
            const body = makeBody({
                event: JobEventType.PIPELINE_STAGE_CHANGED,
                pipelineStage: PipelineStage.RENDERING,
            });

            await facade.processDbOperations(JOB_ID, body);

            expect(findAllByJobId).not.toHaveBeenCalled();
        });
    });

    describe('job 미존재', () => {
        it('findByIdOrThrow가 던지면 BusinessException이 전파된다', async () => {
            findByIdOrThrow.mockRejectedValue(
                new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
            );

            await expect(
                facade.processDbOperations(
                    JOB_ID,
                    makeBody({
                        event: JobEventType.PIPELINE_STAGE_CHANGED,
                        pipelineStage: PipelineStage.RENDERING,
                    })
                )
            ).rejects.toThrow(BusinessException);

            expect(updatePipelineStage).not.toHaveBeenCalled();
        });
    });
});
