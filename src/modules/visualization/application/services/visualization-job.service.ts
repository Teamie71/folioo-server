import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
import { SlidePlan, VisualizationJob } from '../../domain/visualization-job.entity';
import { VisualizationJobRepository } from '../../infrastructure/repositories/visualization-job.repository';

export interface JobCompletionPayload {
    status: VisualizationJobStatus;
    gcsPptxKey: string | null;
}

@Injectable()
export class VisualizationJobService {
    constructor(private readonly vizJobRepo: VisualizationJobRepository) {}

    async createJob(
        portfolioId: number,
        userId: number,
        templateId: string
    ): Promise<VisualizationJob> {
        return this.vizJobRepo.insert({ portfolioId, userId, templateId });
    }

    async findByIdOrThrow(id: string): Promise<VisualizationJob> {
        const job = await this.vizJobRepo.findById(id);
        if (!job) {
            throw new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND);
        }
        return job;
    }

    async findByIdAndUserIdOrThrow(id: string, userId: number): Promise<VisualizationJob> {
        const job = await this.vizJobRepo.findByIdAndUserId(id, userId);
        if (!job) {
            throw new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND);
        }
        return job;
    }

    async findByIdWithRelationsOrThrow(id: string): Promise<VisualizationJob> {
        const job = await this.vizJobRepo.findByIdWithRelations(id);
        if (!job) {
            throw new BusinessException(ErrorCode.VISUALIZATION_JOB_NOT_FOUND);
        }
        return job;
    }

    async isPartialError(id: string): Promise<boolean> {
        const row = await this.vizJobRepo.findStatusById(id);
        return row?.status === VisualizationJobStatus.PARTIAL_ERROR;
    }

    async markAsFailed(id: string): Promise<void> {
        await this.vizJobRepo.updateById(id, { status: VisualizationJobStatus.ERROR });
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

    async updatePipelineStage(id: string, pipelineStage: PipelineStage): Promise<void> {
        await this.vizJobRepo.updateById(id, { pipelineStage });
    }

    async finalizeFromPipeline(id: string, payload: JobCompletionPayload): Promise<void> {
        await this.vizJobRepo.updateById(id, {
            status: payload.status,
            pipelineStage: PipelineStage.COMPLETED,
            gcsPptxKey: payload.gcsPptxKey,
        });
    }
}
