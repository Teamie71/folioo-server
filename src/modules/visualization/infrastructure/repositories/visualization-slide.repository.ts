import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';

export interface SlideInsertRow {
    job: { id: string };
    slideOrder: number;
    sourceSlideId: string;
    slideFilename: string;
}

@Injectable()
export class VisualizationSlideRepository {
    constructor(
        @InjectRepository(VisualizationSlide)
        private readonly repo: Repository<VisualizationSlide>
    ) {}

    findByIdAndJobId(id: string, jobId: string): Promise<VisualizationSlide | null> {
        return this.repo.findOne({ where: { id, job: { id: jobId } } });
    }

    async updateById(id: string, data: QueryDeepPartialEntity<VisualizationSlide>): Promise<void> {
        await this.repo.update(id, data);
    }

    async existsNonCompletedByJobId(jobId: string): Promise<boolean> {
        const count = await this.repo.count({
            where: {
                job: { id: jobId },
                status: Not(VisualizationSlideStatus.COMPLETED),
            },
        });
        return count > 0;
    }

    findAllByJobId(jobId: string): Promise<VisualizationSlide[]> {
        return this.repo.find({
            where: { job: { id: jobId } },
            order: { slideOrder: 'ASC' },
        });
    }

    async deleteAllByJobId(jobId: string): Promise<void> {
        await this.repo.delete({ job: { id: jobId } });
    }

    async bulkInsert(rows: SlideInsertRow[]): Promise<void> {
        if (rows.length === 0) return;
        await this.repo
            .createQueryBuilder()
            .insert()
            .into(VisualizationSlide)
            .values(rows as QueryDeepPartialEntity<VisualizationSlide>[])
            .execute();
    }
}
