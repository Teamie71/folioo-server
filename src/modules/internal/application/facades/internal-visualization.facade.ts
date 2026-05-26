import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SlidePlan } from 'src/modules/visualization/domain/visualization-job.entity';
import { VisualizationJobService } from 'src/modules/visualization/application/services/visualization-job.service';
import { VisualizationSlideService } from 'src/modules/visualization/application/services/visualization-slide.service';
import {
    InternalVisualizationJobResDTO,
    InternalVisualizationSlideResDTO,
    SaveSlidePlanReqDTO,
} from '../dtos/internal-visualization.dto';

@Injectable()
export class InternalVisualizationFacade {
    private readonly logger = new Logger(InternalVisualizationFacade.name);

    constructor(
        private readonly vizJobService: VisualizationJobService,
        private readonly vizSlideService: VisualizationSlideService
    ) {}

    @Transactional()
    async saveSlidePlan(jobId: string, body: SaveSlidePlanReqDTO): Promise<void> {
        if (body.totalSlides !== body.slides.length) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: `totalSlides(${body.totalSlides})와 slides 배열 길이(${body.slides.length})가 일치하지 않습니다.`,
            });
        }

        this.logger.log(
            `[slide-plan] START jobId=${jobId} idempotencyKey=${body.idempotencyKey} schemaVersion=${body.schemaVersion}`
        );

        const job = await this.vizJobService.findByIdOrThrow(jobId);
        if (job.templateId !== body.templateId) {
            throw new BusinessException(ErrorCode.VISUALIZATION_TEMPLATE_ID_MISMATCH);
        }
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

    async getJob(jobId: string): Promise<InternalVisualizationJobResDTO> {
        const job = await this.vizJobService.findByIdWithRelationsOrThrow(jobId);
        return InternalVisualizationJobResDTO.from(job);
    }

    async getSlide(jobId: string, slideId: string): Promise<InternalVisualizationSlideResDTO> {
        const slide = await this.vizSlideService.findByIdAndJobIdOrThrow(slideId, jobId);
        return InternalVisualizationSlideResDTO.from(slide, jobId);
    }
}
