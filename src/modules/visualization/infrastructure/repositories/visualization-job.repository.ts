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

    async updateById(id: string, data: Partial<VisualizationJob>): Promise<void> {
        await this.repo.update(id, data);
    }
}
