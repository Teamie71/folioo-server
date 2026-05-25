import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';

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

    async bulkInsertIgnoreConflict(rows: SlideInsertRow[]): Promise<void> {
        if (rows.length === 0) return;
        await this.repo
            .createQueryBuilder()
            .insert()
            .into(VisualizationSlide)
            .values(rows as QueryDeepPartialEntity<VisualizationSlide>[])
            .orIgnore()
            .execute();
    }
}
