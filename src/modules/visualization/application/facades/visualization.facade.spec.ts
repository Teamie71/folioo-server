import { CloudTasksPort } from 'src/common/ports/cloud-tasks.port';
import { StoragePort } from 'src/common/ports/storage.port';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';
import { VisualizationJob } from '../../domain/visualization-job.entity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';
import { VisualizationJobService } from '../services/visualization-job.service';
import { VisualizationSlideService } from '../services/visualization-slide.service';
import { VisualizationFacade } from './visualization.facade';

const USER_ID = 1;
const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeJob(overrides: Partial<VisualizationJob> = {}): VisualizationJob {
    return {
        id: JOB_ID,
        status: VisualizationJobStatus.COMPLETED,
        pipelineStage: PipelineStage.COMPLETED,
        totalSlides: 2,
        gcsPptxKey: `jobs/${JOB_ID}/current.pptx`,
        slidePlan: null,
        regenerationCount: 2,
        ...overrides,
    } as VisualizationJob;
}

function makeSlide(
    slideOrder: number,
    overrides: Partial<VisualizationSlide> = {}
): VisualizationSlide {
    return {
        id: `bbbbbbbb-0000-0000-0000-00000000000${slideOrder}`,
        slideOrder,
        sourceSlideId: `source-${slideOrder}`,
        slideFilename: `slide${slideOrder}.xml`,
        status: VisualizationSlideStatus.COMPLETED,
        currentFills: null,
        gcsPreviewKey: null,
        errorMessage: null,
        job: { id: JOB_ID } as VisualizationJob,
        createdAt: new Date('2026-05-25T00:00:00Z'),
        updatedAt: new Date('2026-05-25T00:00:00Z'),
        ...overrides,
    } as VisualizationSlide;
}

describe('VisualizationFacade', () => {
    let facade: VisualizationFacade;
    let findByIdAndUserIdOrThrow: jest.Mock;
    let findAllByJobId: jest.Mock;
    let getSignedUrl: jest.Mock;

    beforeEach(() => {
        findByIdAndUserIdOrThrow = jest.fn().mockResolvedValue(makeJob());
        findAllByJobId = jest
            .fn()
            .mockResolvedValue([
                makeSlide(1, { gcsPreviewKey: `jobs/${JOB_ID}/previews/slide-01.jpg` }),
                makeSlide(2),
            ]);
        getSignedUrl = jest.fn().mockResolvedValue('https://signed-preview-url');

        const portfolioService = {} as PortfolioService;
        const vizJobService = {
            findByIdAndUserIdOrThrow,
        } as unknown as VisualizationJobService;
        const vizSlideService = {
            findAllByJobId,
        } as unknown as VisualizationSlideService;
        const cloudTasksPort = {} as CloudTasksPort;
        const storagePort = {
            getSignedUrl,
        } as unknown as StoragePort;

        facade = new VisualizationFacade(
            portfolioService,
            vizJobService,
            vizSlideService,
            cloudTasksPort,
            storagePort
        );
    });

    describe('getSlides', () => {
        it('job 소유권을 검증하고 슬라이드 목록과 preview signed URL을 반환한다', async () => {
            const result = await facade.getSlides(USER_ID, JOB_ID);

            expect(findByIdAndUserIdOrThrow).toHaveBeenCalledWith(JOB_ID, USER_ID);
            expect(findAllByJobId).toHaveBeenCalledWith(JOB_ID);
            expect(getSignedUrl).toHaveBeenCalledWith(`jobs/${JOB_ID}/previews/slide-01.jpg`, 3600);
            expect(getSignedUrl).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({
                jobStatus: VisualizationJobStatus.COMPLETED,
                pipelineStage: PipelineStage.COMPLETED,
                canExport: true,
                blockingSlides: [],
                blockingReasons: {},
                remainingRegenerations: 8,
                slides: [
                    {
                        slideId: 'bbbbbbbb-0000-0000-0000-000000000001',
                        slideOrder: 1,
                        sourceSlideId: 'source-1',
                        status: VisualizationSlideStatus.COMPLETED,
                        previewUrl: 'https://signed-preview-url',
                        errorMessage: null,
                    },
                    {
                        slideId: 'bbbbbbbb-0000-0000-0000-000000000002',
                        slideOrder: 2,
                        sourceSlideId: 'source-2',
                        status: VisualizationSlideStatus.COMPLETED,
                        previewUrl: null,
                        errorMessage: null,
                    },
                ],
            });
        });

        it('완료되지 않은 슬라이드는 blockingSlides에 포함한다', async () => {
            findByIdAndUserIdOrThrow.mockResolvedValue(
                makeJob({ status: VisualizationJobStatus.GENERATING })
            );
            findAllByJobId.mockResolvedValue([
                makeSlide(1),
                makeSlide(2, {
                    status: VisualizationSlideStatus.ERROR,
                    errorMessage: '렌더 실패',
                }),
            ]);

            const result = await facade.getSlides(USER_ID, JOB_ID);

            expect(result.canExport).toBe(false);
            expect(result.blockingSlides).toEqual([2]);
            expect(result.blockingReasons).toEqual({
                '2': VisualizationSlideStatus.ERROR,
                _job: VisualizationJobStatus.GENERATING,
            });
            expect(result.slides[1].errorMessage).toBe('렌더 실패');
        });

        it('일부 preview signed URL 발급에 실패해도 슬라이드 목록을 반환한다', async () => {
            getSignedUrl.mockRejectedValue(new Error('signed URL failed'));

            const result = await facade.getSlides(USER_ID, JOB_ID);

            expect(result.slides[0].previewUrl).toBeNull();
            expect(result.slides[1].previewUrl).toBeNull();
        });

        it('regenerationCount가 없으면 0으로 간주해 remainingRegenerations를 계산한다', async () => {
            findByIdAndUserIdOrThrow.mockResolvedValue(makeJob({ regenerationCount: undefined }));

            const result = await facade.getSlides(USER_ID, JOB_ID);

            expect(result.remainingRegenerations).toBe(10);
        });
    });

    describe('getExportStatus', () => {
        it('job 소유권을 검증하고 computeCanExport 결과를 반환한다', async () => {
            findAllByJobId.mockResolvedValue([
                makeSlide(1),
                makeSlide(2, { status: VisualizationSlideStatus.REGENERATING }),
            ]);

            const result = await facade.getExportStatus(USER_ID, JOB_ID);

            expect(findByIdAndUserIdOrThrow).toHaveBeenCalledWith(JOB_ID, USER_ID);
            expect(findAllByJobId).toHaveBeenCalledWith(JOB_ID);
            expect(getSignedUrl).not.toHaveBeenCalled();
            expect(result).toEqual({
                canExport: false,
                blockingSlides: [2],
                blockingReasons: {
                    '2': VisualizationSlideStatus.REGENERATING,
                },
            });
        });

        it('job 자체가 내보내기 불가 상태이면 blockingReasons에 job 사유를 포함한다', async () => {
            findByIdAndUserIdOrThrow.mockResolvedValue(
                makeJob({ status: VisualizationJobStatus.ERROR, gcsPptxKey: null })
            );
            findAllByJobId.mockResolvedValue([makeSlide(1)]);

            const result = await facade.getExportStatus(USER_ID, JOB_ID);

            expect(result.canExport).toBe(false);
            expect(result.blockingSlides).toEqual([]);
            expect(result.blockingReasons).toEqual({
                _job: VisualizationJobStatus.ERROR,
                _pptx: 'missing_current_pptx',
            });
        });
    });
});
