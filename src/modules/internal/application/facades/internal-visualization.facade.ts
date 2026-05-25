import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { SlidePlan } from 'src/modules/visualization/domain/visualization-job.entity';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import { SaveSlidePlanReqDTO } from '../dtos/internal-visualization.dto';

@Injectable()
export class InternalVisualizationFacade {
    private readonly logger = new Logger(InternalVisualizationFacade.name);

    constructor(
        private readonly vizJobService: VisualizationJobService,
        private readonly vizSlideService: VisualizationSlideService
    ) {}

    @Transactional()
    async saveSlidePlan(jobId: string, body: SaveSlidePlanReqDTO): Promise<void> {
        this.logger.log(
            `[slide-plan] START jobId=${jobId} idempotencyKey=${body.idempotencyKey} schemaVersion=${body.schemaVersion}`
        );

        await this.vizJobService.findByIdOrThrow(jobId);
        await this.vizJobService.updateSlidePlan(
            jobId,
            body.totalSlides,
            body.slidePlan as unknown as SlidePlan
        );
        await this.vizSlideService.bulkInsert(jobId, body.slides);

        this.logger.log(
            `[slide-plan] DONE jobId=${jobId} idempotencyKey=${body.idempotencyKey} totalSlides=${body.totalSlides}`
        );

        // TODO: SSE — visualizations.{jobId} 채널에 slide_plan_ready 이벤트 emit
    }
}
