import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { VisualizationJobStatus } from 'src/modules/visualization/domain/enums/visualization-job-status.enum';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import {
    CanExportResult,
    computeCanExport,
} from 'src/modules/visualization/application/utils/can-export.util';
import { JobEventCallbackReqDTO, JobEventType } from '../dtos/internal-visualization-job-event.dto';

@Injectable()
export class InternalVisualizationJobEventFacade {
    private readonly logger = new Logger(InternalVisualizationJobEventFacade.name);

    constructor(
        private readonly vizJobService: VisualizationJobService,
        private readonly vizSlideService: VisualizationSlideService
    ) {}

    async handleJobEvent(jobId: string, body: JobEventCallbackReqDTO): Promise<void> {
        this.logger.log(
            `[job-event] START jobId=${jobId} event=${body.event} idempotencyKey=${body.idempotencyKey} schemaVersion=${body.schemaVersion}`
        );

        const canExportResult = await this.processDbOperations(jobId, body);

        if (canExportResult) {
            // TODO: SSE — visualizations.{jobId} 채널에 all_completed 이벤트 emit
            // 페이로드 예시:
            //   { event: 'all_completed', jobId, summary: body.summary, canExport: canExportResult.canExport,
            //     blockingSlides: canExportResult.blockingSlides, blockingReasons: canExportResult.blockingReasons }
            void canExportResult;
        }

        this.logger.log(
            `[job-event] DONE jobId=${jobId} event=${body.event} idempotencyKey=${body.idempotencyKey}`
        );
    }

    @Transactional()
    async processDbOperations(
        jobId: string,
        body: JobEventCallbackReqDTO
    ): Promise<CanExportResult | null> {
        await this.vizJobService.findByIdOrThrow(jobId);

        if (body.event === JobEventType.PIPELINE_STAGE_CHANGED) {
            await this.vizJobService.updatePipelineStage(jobId, body.pipelineStage!);
            return null;
        }

        // all_completed
        const status = this.resolveJobStatus(body);
        await this.vizJobService.finalizeFromPipeline(jobId, {
            status,
            gcsPptxKey: body.gcsPptxKey ?? null,
        });

        const [job, slides] = await Promise.all([
            this.vizJobService.findByIdOrThrow(jobId),
            this.vizSlideService.findAllByJobId(jobId),
        ]);

        return computeCanExport(job, slides);
    }

    private resolveJobStatus(body: JobEventCallbackReqDTO): VisualizationJobStatus {
        if ((body.summary?.completed ?? 0) === 0) return VisualizationJobStatus.ERROR;
        if ((body.summary?.failed ?? 0) > 0) return VisualizationJobStatus.PARTIAL_ERROR;
        return VisualizationJobStatus.COMPLETED;
    }
}
