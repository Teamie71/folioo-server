import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';
import {
    SlideInsertRow,
    VisualizationSlideRepository,
} from '../../infrastructure/repositories/visualization-slide.repository';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';

export interface SlideInput {
    slideOrder: number;
    sourceSlideId: string;
    slideFilename: string;
}

export interface SlideUpdatePayload {
    status: VisualizationSlideStatus;
    currentFills?: Record<string, unknown>;
    gcsPreviewKey?: string;
}

@Injectable()
export class VisualizationSlideService {
    constructor(private readonly vizSlideRepo: VisualizationSlideRepository) {}

    async findByIdAndJobIdOrThrow(slideId: string, jobId: string): Promise<VisualizationSlide> {
        const slide = await this.vizSlideRepo.findByIdAndJobId(slideId, jobId);
        if (!slide) {
            throw new BusinessException(ErrorCode.VISUALIZATION_SLIDE_NOT_FOUND);
        }
        return slide;
    }

    async applyEventUpdate(slideId: string, payload: SlideUpdatePayload): Promise<void> {
        const update: Record<string, unknown> = { status: payload.status };
        if (payload.currentFills !== undefined) update['currentFills'] = payload.currentFills;
        if (payload.gcsPreviewKey !== undefined) update['gcsPreviewKey'] = payload.gcsPreviewKey;
        await this.vizSlideRepo.updateById(
            slideId,
            update as QueryDeepPartialEntity<VisualizationSlide>
        );
    }

    async findAllByJobId(jobId: string): Promise<VisualizationSlide[]> {
        return this.vizSlideRepo.findAllByJobId(jobId);
    }

    async hasNonCompletedSlides(jobId: string): Promise<boolean> {
        return this.vizSlideRepo.existsNonCompletedByJobId(jobId);
    }

    async replaceSlides(jobId: string, slides: SlideInput[]): Promise<VisualizationSlide[]> {
        await this.vizSlideRepo.deleteAllByJobId(jobId);
        const rows: SlideInsertRow[] = slides.map((s) => ({
            job: { id: jobId },
            slideOrder: s.slideOrder,
            sourceSlideId: s.sourceSlideId,
            slideFilename: s.slideFilename,
        }));
        await this.vizSlideRepo.bulkInsert(rows);
        return this.vizSlideRepo.findAllByJobId(jobId);
    }
}
