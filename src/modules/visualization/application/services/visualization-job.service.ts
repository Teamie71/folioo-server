import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
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

    async isPartialError(id: string): Promise<boolean> {
        const job = await this.vizJobRepo.findById(id);
        return job?.status === VisualizationJobStatus.PARTIAL_ERROR;
    }

    async decrementRegenerationCount(id: string): Promise<void> {
        await this.vizJobRepo.decrementRegenerationCount(id);
    }

    async finalizeToCompleted(id: string): Promise<void> {
        await this.vizJobRepo.updateById(id, {
            status: VisualizationJobStatus.COMPLETED,
            pipelineStage: PipelineStage.COMPLETED,
        });
    }

    async updateSlidePlan(id: string, totalSlides: number, slidePlan: SlidePlan): Promise<void> {
        await this.vizJobRepo.updateById(id, {
            totalSlides,
            slidePlan,
        });
    }
}
