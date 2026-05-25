import { VisualizationJob } from '../../domain/visualization-job.entity';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';

export interface CanExportResult {
    canExport: boolean;
    blockingSlides: number[];
    blockingReasons: Record<string, string>;
}

export function computeCanExport(
    job: VisualizationJob,
    slides: VisualizationSlide[]
): CanExportResult {
    const blockingSlides = slides
        .filter((s) => s.status !== VisualizationSlideStatus.COMPLETED)
        .map((s) => s.slideOrder);

    const blockingReasons: Record<string, string> = {};

    for (const s of slides) {
        if (s.status !== VisualizationSlideStatus.COMPLETED) {
            blockingReasons[String(s.slideOrder)] = s.status;
        }
    }

    if (job.status !== VisualizationJobStatus.COMPLETED) {
        blockingReasons['_job'] = job.status;
    }
    if (!job.gcsPptxKey) {
        blockingReasons['_pptx'] = 'missing_current_pptx';
    }
    if (job.totalSlides <= 0) {
        blockingReasons['_slides'] = 'no_slides';
    }

    const canExport =
        job.status === VisualizationJobStatus.COMPLETED &&
        job.gcsPptxKey !== null &&
        job.totalSlides > 0 &&
        blockingSlides.length === 0;

    return { canExport, blockingSlides, blockingReasons };
}
