import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';
import { VisualizationJob } from '../../domain/visualization-job.entity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';
import { VisualizationJobRepository } from '../../infrastructure/repositories/visualization-job.repository';
import { VisualizationJobService } from './visualization-job.service';

const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeJob(overrides: Partial<VisualizationJob> = {}): VisualizationJob {
    return Object.assign(new VisualizationJob(), {
        id: JOB_ID,
        status: VisualizationJobStatus.COMPLETED,
        pipelineStage: PipelineStage.COMPLETED,
        totalSlides: 2,
        gcsPptxKey: `jobs/${JOB_ID}/current.pptx`,
        slidePlan: null,
        regenerationCount: 0,
        ...overrides,
    });
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

describe('VisualizationJobService', () => {
    let service: VisualizationJobService;

    beforeEach(() => {
        service = new VisualizationJobService({} as VisualizationJobRepository);
    });

    describe('getExportStatus', () => {
        it('내보내기 가능 여부를 job과 slides 상태로 계산한다', () => {
            const result = service.getExportStatus(makeJob(), [makeSlide(1), makeSlide(2)]);

            expect(result).toEqual({
                canExport: true,
                blockingSlides: [],
                blockingReasons: {},
            });
        });
    });

    describe('getExportFileKeysOrThrow', () => {
        it('내보내기 가능 상태이면 PPTX와 PDF GCS key를 반환한다', () => {
            const result = service.getExportFileKeysOrThrow(makeJob(), [
                makeSlide(1),
                makeSlide(2),
            ]);

            expect(result).toEqual({
                pptxKey: `jobs/${JOB_ID}/current.pptx`,
                pdfKey: `jobs/${JOB_ID}/current.pdf`,
            });
        });

        it('내보내기 불가 상태이면 BusinessException을 던진다', () => {
            expect(() =>
                service.getExportFileKeysOrThrow(makeJob(), [
                    makeSlide(1),
                    makeSlide(2, { status: VisualizationSlideStatus.REGENERATING }),
                ])
            ).toThrow(BusinessException);
        });

        it('차단 에러 details에 blocking 정보를 포함한다', () => {
            try {
                service.getExportFileKeysOrThrow(makeJob(), [
                    makeSlide(1),
                    makeSlide(2, { status: VisualizationSlideStatus.ERROR }),
                ]);
                fail('BusinessException should have been thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(BusinessException);
                expect((error as BusinessException).getResponse()).toMatchObject({
                    errorCode: ErrorCode.VISUALIZATION_EXPORT_BLOCKED,
                    details: {
                        blockingSlides: [2],
                        blockingReasons: {
                            '2': VisualizationSlideStatus.ERROR,
                        },
                    },
                });
            }
        });
    });
});
