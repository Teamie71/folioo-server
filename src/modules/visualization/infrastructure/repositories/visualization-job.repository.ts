import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisualizationJob } from '../../domain/visualization-job.entity';

@Injectable()
export class VisualizationJobRepository {
    constructor(
        @InjectRepository(VisualizationJob)
        private readonly repo: Repository<VisualizationJob>
    ) {}

    findById(id: string): Promise<VisualizationJob | null> {
        return this.repo.findOne({ where: { id } });
    }

    findStatusById(id: string): Promise<Pick<VisualizationJob, 'status'> | null> {
        return this.repo.findOne({ where: { id }, select: { status: true } });
    }

    async updateById(id: string, data: Partial<VisualizationJob>): Promise<void> {
        await this.repo.update(id, data);
    }

    async decrementRegenerationCount(id: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .update(VisualizationJob)
            .set({ regenerationCount: () => 'regeneration_count - 1' })
            .where('id = :id AND regeneration_count > 0', { id })
            .execute();
    }
}
