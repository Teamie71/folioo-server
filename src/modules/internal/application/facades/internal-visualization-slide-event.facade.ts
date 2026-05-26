import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { StoragePort } from 'src/common/ports/storage.port';
import { VisualizationSlideStatus } from 'src/modules/visualization/domain/enums/visualization-slide-status.enum';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import {
    COMPLETING_EVENTS,
    SlideEventCallbackReqDTO,
    SlideEventType,
} from '../dtos/internal-visualization-slide-event.dto';

const EVENT_STATUS_MAP: Record<
    Exclude<SlideEventType, SlideEventType.SLIDE_PREVIEW_ERROR>,
    VisualizationSlideStatus
> = {
    [SlideEventType.SLIDE_CONTENT_READY]: VisualizationSlideStatus.GENERATING,
    [SlideEventType.SLIDE_CONTENT_ERROR]: VisualizationSlideStatus.ERROR,
    [SlideEventType.SLIDE_PREVIEW_READY]: VisualizationSlideStatus.COMPLETED,
    [SlideEventType.SLIDE_REGENERATED]: VisualizationSlideStatus.COMPLETED,
};

const PREVIEW_SIGNED_URL_TTL_SECONDS = 3600;

@Injectable()
export class InternalVisualizationSlideEventFacade {
    private readonly logger = new Logger(InternalVisualizationSlideEventFacade.name);

    constructor(
        private readonly vizSlideService: VisualizationSlideService,
        private readonly vizJobService: VisualizationJobService,
        private readonly storagePort: StoragePort
    ) {}

    async handleSlideEvent(
        jobId: string,
        slideId: string,
        body: SlideEventCallbackReqDTO
    ): Promise<void> {
        this.logger.log(
            `[slide-event] START jobId=${jobId} slideId=${slideId} event=${body.event} idempotencyKey=${body.idempotencyKey} schemaVersion=${body.schemaVersion}`
        );

        const gcsPreviewKey = await this.processDbOperations(jobId, slideId, body);

        let previewUrl: string | null = null;
        if (gcsPreviewKey) {
            previewUrl = await this.storagePort.getSignedUrl(
                gcsPreviewKey,
                PREVIEW_SIGNED_URL_TTL_SECONDS
            );
        }

        // TODO: SSE — visualizations.{jobId} 채널에 이벤트 emit
        // 워커→메인 콜백 페이로드와 메인→프론트 SSE 페이로드는 다음과 같이 매핑:
        //   slide_content_ready → { event, slideId, slideOrder }
        //   slide_content_error → { event, slideId, slideOrder, message }
        //   slide_preview_ready → { event, slideId, slideOrder, previewUrl }  ← GCS key → signed URL
        //   slide_preview_error → { event, slideId, slideOrder, message, retryable }
        //   slide_regenerated   → { event, slideId, slideOrder, previewUrl, remainingRegenerations }
        // job이 finalize된 경우 추가로 all_completed 이벤트 emit 필요
        void previewUrl;

        this.logger.log(
            `[slide-event] DONE jobId=${jobId} slideId=${slideId} event=${body.event} idempotencyKey=${body.idempotencyKey}`
        );
    }

    @Transactional()
    async processDbOperations(
        jobId: string,
        slideId: string,
        body: SlideEventCallbackReqDTO
    ): Promise<string | null> {
        const slide = await this.vizSlideService.findByIdAndJobIdOrThrow(slideId, jobId);

        if (body.event === SlideEventType.SLIDE_PREVIEW_ERROR) {
            await this.handlePreviewError(jobId, slideId, slide.status);
            return null;
        }

        await this.vizSlideService.applyEventUpdate(slideId, {
            status: EVENT_STATUS_MAP[body.event],
            currentFills: body.currentFills,
            gcsPreviewKey: body.gcsPreviewKey,
        });

        if (COMPLETING_EVENTS.includes(body.event)) {
            const isPartialError = await this.vizJobService.isPartialError(jobId);
            if (isPartialError) {
                const hasNonCompleted = await this.vizSlideService.hasNonCompletedSlides(jobId);
                if (!hasNonCompleted) {
                    await this.vizJobService.finalizeToCompleted(jobId);
                }
            }
        }

        return body.gcsPreviewKey ?? null;
    }

    private async handlePreviewError(
        jobId: string,
        slideId: string,
        currentStatus: VisualizationSlideStatus
    ): Promise<void> {
        if (currentStatus === VisualizationSlideStatus.REGENERATING) {
            // Phase 2: completed로 롤백 + regeneration_count 보상 차감
            await this.vizSlideService.applyEventUpdate(slideId, {
                status: VisualizationSlideStatus.COMPLETED,
            });
            await this.vizJobService.decrementRegenerationCount(jobId);
        } else {
            // Phase 1: error 전이
            await this.vizSlideService.applyEventUpdate(slideId, {
                status: VisualizationSlideStatus.ERROR,
            });
        }
    }
}
