import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { SlidePlan, VisualizationJob } from '../../domain/visualization-job.entity';
import { VisualizationJobRepository } from '../../infrastructure/repositories/visualization-job.repository';

@Injectable()
export class VisualizationJobService {
    constructor(private readonly vizJobRepo: VisualizationJobRepository) {}

    async findByIdOrThrow(id: string): Promise<VisualizationJob> {
        const job = await this.vizJobRepo.findById(id);
        if (!job) {
            throw new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND);
        }
        return job;
    }

    async updateSlidePlan(id: string, totalSlides: number, slidePlan: SlidePlan): Promise<void> {
        await this.vizJobRepo.updateById(id, {
            totalSlides,
            slidePlan,
            pipelineStage: PipelineStage.RENDERING,
        });
    }
}
