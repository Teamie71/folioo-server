import { Injectable } from '@nestjs/common';
import {
    SlideInsertRow,
    VisualizationSlideRepository,
} from '../../infrastructure/repositories/visualization-slide.repository';

export interface SlideInput {
    slideOrder: number;
    sourceSlideId: string;
    slideFilename: string;
}

@Injectable()
export class VisualizationSlideService {
    constructor(private readonly vizSlideRepo: VisualizationSlideRepository) {}

    async bulkInsert(jobId: string, slides: SlideInput[]): Promise<void> {
        const rows: SlideInsertRow[] = slides.map((s) => ({
            job: { id: jobId },
            slideOrder: s.slideOrder,
            sourceSlideId: s.sourceSlideId,
            slideFilename: s.slideFilename,
        }));
        await this.vizSlideRepo.bulkInsertIgnoreConflict(rows);
    }
}
