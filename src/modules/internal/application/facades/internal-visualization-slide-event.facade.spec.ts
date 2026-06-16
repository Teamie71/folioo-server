jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: object, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { InternalVisualizationSlideEventFacade } from './internal-visualization-slide-event.facade';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { StoragePort } from 'src/common/ports/storage.port';
import {
    SlideEventCallbackReqDTO,
    SlideEventType,
} from '../dtos/internal-visualization-slide-event.dto';
import { VisualizationSlideStatus } from 'src/modules/visualization/domain/enums/visualization-slide-status.enum';
import { VisualizationSlide } from 'src/modules/visualization/domain/visualization-slide.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const JOB_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const SLIDE_ID = 'bbbbbbbb-0000-0000-0000-000000000001';
const GCS_KEY = 'jobs/test/previews/slide-01.jpg';
const SIGNED_URL = 'https://storage.googleapis.com/signed';

function makeSlide(status: VisualizationSlideStatus): VisualizationSlide {
    return { id: SLIDE_ID, status } as VisualizationSlide;
}

function makeBody(overrides: Partial<SlideEventCallbackReqDTO>): SlideEventCallbackReqDTO {
    return {
        event: SlideEventType.SLIDE_CONTENT_READY,
        slideOrder: 1,
        occurredAt: '2026-05-25T00:00:00Z',
        idempotencyKey: 'key-1',
        schemaVersion: 1,
        ...overrides,
    };
}

describe('InternalVisualizationSlideEventFacade', () => {
    let facade: InternalVisualizationSlideEventFacade;

    // mock 함수를 변수로 분리 → @typescript-eslint/unbound-method 회피
    let findByIdAndJobIdOrThrow: jest.Mock;
    let applyEventUpdate: jest.Mock;
    let hasNonCompletedSlides: jest.Mock;
    let isPartialError: jest.Mock;
    let finalizeToCompleted: jest.Mock;
    let decrementRegenerationCount: jest.Mock;
    let getSignedUrl: jest.Mock;

    beforeEach(() => {
        findByIdAndJobIdOrThrow = jest.fn();
        applyEventUpdate = jest.fn();
        hasNonCompletedSlides = jest.fn().mockResolvedValue(false);
        isPartialError = jest.fn().mockResolvedValue(false);
        finalizeToCompleted = jest.fn();
        decrementRegenerationCount = jest.fn();
        getSignedUrl = jest.fn().mockResolvedValue(SIGNED_URL);

        const vizSlideService = {
            findByIdAndJobIdOrThrow,
            applyEventUpdate,
            hasNonCompletedSlides,
            bulkInsert: jest.fn(),
        } as unknown as VisualizationSlideService;

        const vizJobService = {
            findByIdOrThrow: jest.fn(),
            isPartialError,
            finalizeToCompleted,
            decrementRegenerationCount,
            updateSlidePlan: jest.fn(),
        } as unknown as VisualizationJobService;

        const storagePort = { getSignedUrl } as unknown as StoragePort;

        facade = new InternalVisualizationSlideEventFacade(
            vizSlideService,
            vizJobService,
            storagePort
        );
    });

    describe('slide_content_ready', () => {
        it('status를 generating으로 업데이트한다', async () => {
            findByIdAndJobIdOrThrow.mockResolvedValue(makeSlide(VisualizationSlideStatus.PENDING));
            const body = makeBody({
                event: SlideEventType.SLIDE_CONTENT_READY,
                currentFills: {
                    title: {
                        role: 'title',
                        action: 'text',
                        text: 'hi',
                        font_size_override: null,
                        is_title: true,
                    },
                },
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.GENERATING,
                currentFills: body.currentFills,
                gcsPreviewKey: undefined,
                errorMessage: null,
            });
            expect(getSignedUrl).not.toHaveBeenCalled();
        });
    });

    describe('slide_content_error', () => {
        it('status를 error로 업데이트한다', async () => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.GENERATING)
            );
            const body = makeBody({
                event: SlideEventType.SLIDE_CONTENT_ERROR,
                message: '실패',
                retryable: false,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.ERROR,
                currentFills: undefined,
                gcsPreviewKey: undefined,
                errorMessage: '실패',
            });
        });
    });

    describe('slide_preview_ready', () => {
        beforeEach(() => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.GENERATING)
            );
        });

        it('status를 completed로 업데이트하고 gcsPreviewKey를 반환한다', async () => {
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_READY,
                gcsPreviewKey: GCS_KEY,
            });

            const result = await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.COMPLETED,
                currentFills: undefined,
                gcsPreviewKey: GCS_KEY,
                errorMessage: null,
            });
            expect(result).toBe(GCS_KEY);
        });

        it('handleSlideEvent에서 signed URL을 발급한다', async () => {
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_READY,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.handleSlideEvent(JOB_ID, SLIDE_ID, body);

            expect(getSignedUrl).toHaveBeenCalledWith(GCS_KEY, 3600);
        });

        it('job이 partial_error이고 미완료 슬라이드가 없으면 completed로 finalize한다', async () => {
            isPartialError.mockResolvedValue(true);
            hasNonCompletedSlides.mockResolvedValue(false);
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_READY,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(finalizeToCompleted).toHaveBeenCalledWith(JOB_ID);
        });

        it('job이 partial_error여도 미완료 슬라이드가 남으면 finalize하지 않는다', async () => {
            isPartialError.mockResolvedValue(true);
            hasNonCompletedSlides.mockResolvedValue(true);
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_READY,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(finalizeToCompleted).not.toHaveBeenCalled();
        });

        it('job이 partial_error가 아니면 finalize 체크 자체를 건너뛴다', async () => {
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_READY,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(hasNonCompletedSlides).not.toHaveBeenCalled();
            expect(finalizeToCompleted).not.toHaveBeenCalled();
        });
    });

    describe('slide_preview_error', () => {
        it('Phase 1(generating): status를 error로 업데이트한다', async () => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.GENERATING)
            );
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_ERROR,
                message: '렌더 실패',
                retryable: true,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.ERROR,
                errorMessage: '렌더 실패',
            });
            expect(decrementRegenerationCount).not.toHaveBeenCalled();
        });

        it('Phase 2(regenerating): status를 completed로 롤백하고 regeneration_count를 보상 차감한다', async () => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.REGENERATING)
            );
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_ERROR,
                message: '재생성 실패',
                retryable: false,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.COMPLETED,
                errorMessage: null,
            });
            expect(decrementRegenerationCount).toHaveBeenCalledWith(JOB_ID);
        });

        it('Phase 2 롤백 시 signed URL을 발급하지 않는다', async () => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.REGENERATING)
            );
            const body = makeBody({
                event: SlideEventType.SLIDE_PREVIEW_ERROR,
                message: '실패',
                retryable: false,
            });

            await facade.handleSlideEvent(JOB_ID, SLIDE_ID, body);

            expect(getSignedUrl).not.toHaveBeenCalled();
        });
    });

    describe('slide_regenerated', () => {
        beforeEach(() => {
            findByIdAndJobIdOrThrow.mockResolvedValue(
                makeSlide(VisualizationSlideStatus.REGENERATING)
            );
        });

        it('status를 completed로 업데이트하고 gcsPreviewKey를 반환한다', async () => {
            const body = makeBody({
                event: SlideEventType.SLIDE_REGENERATED,
                gcsPreviewKey: GCS_KEY,
            });

            const result = await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(applyEventUpdate).toHaveBeenCalledWith(SLIDE_ID, {
                status: VisualizationSlideStatus.COMPLETED,
                currentFills: undefined,
                gcsPreviewKey: GCS_KEY,
                errorMessage: null,
            });
            expect(result).toBe(GCS_KEY);
        });

        it('handleSlideEvent에서 signed URL을 발급한다', async () => {
            const body = makeBody({
                event: SlideEventType.SLIDE_REGENERATED,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.handleSlideEvent(JOB_ID, SLIDE_ID, body);

            expect(getSignedUrl).toHaveBeenCalledWith(GCS_KEY, 3600);
        });

        it('job finalize 체크를 수행한다', async () => {
            isPartialError.mockResolvedValue(true);
            hasNonCompletedSlides.mockResolvedValue(false);
            const body = makeBody({
                event: SlideEventType.SLIDE_REGENERATED,
                gcsPreviewKey: GCS_KEY,
            });

            await facade.processDbOperations(JOB_ID, SLIDE_ID, body);

            expect(finalizeToCompleted).toHaveBeenCalledWith(JOB_ID);
        });
    });

    describe('슬라이드 미존재', () => {
        it('slideId가 jobId에 속하지 않으면 BusinessException을 던진다', async () => {
            findByIdAndJobIdOrThrow.mockRejectedValue(
                new BusinessException(ErrorCode.VISUALIZATION_SLIDE_NOT_FOUND)
            );

            await expect(
                facade.processDbOperations(
                    JOB_ID,
                    SLIDE_ID,
                    makeBody({ event: SlideEventType.SLIDE_CONTENT_READY })
                )
            ).rejects.toThrow(BusinessException);
            expect(applyEventUpdate).not.toHaveBeenCalled();
        });
    });
});
