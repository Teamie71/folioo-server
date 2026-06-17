import { Inject, Injectable } from '@nestjs/common';
import { CloudTasksPort } from 'src/common/ports/cloud-tasks.port';
import { StoragePort } from 'src/common/ports/storage.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import {
    CreateVisualizationResDTO,
    VisualizationExportResDTO,
    VisualizationExportStatusResDTO,
    VisualizationSlideItemResDTO,
    VisualizationSlidesResDTO,
} from '../dtos/visualization.dto';
import { VisualizationJobService } from '../services/visualization-job.service';
import { VisualizationSlideService } from '../services/visualization-slide.service';
import { computeCanExport } from '../utils/can-export.util';

const PREVIEW_TTL_SECONDS = 60 * 60;
const EXPORT_TTL_SECONDS = 60 * 5;
const MAX_REGENERATIONS = 10;

@Injectable()
export class VisualizationFacade {
    constructor(
        private readonly portfolioService: PortfolioService,
        private readonly vizJobService: VisualizationJobService,
        private readonly vizSlideService: VisualizationSlideService,
        private readonly cloudTasksPort: CloudTasksPort,
        @Inject(StoragePort)
        private readonly storagePort: StoragePort
    ) {}

    async createVisualization(
        userId: number,
        portfolioId: number,
        templateId: string
    ): Promise<CreateVisualizationResDTO> {
        await this.portfolioService.findByIdOrThrow(portfolioId, userId);

        const job = await this.vizJobService.createJob(portfolioId, userId, templateId);

        try {
            await this.cloudTasksPort.enqueueVisualizationTask({
                jobId: job.id,
                portfolioId,
                userId,
                templateId,
                idempotencyKey: `viz-generate-${job.id}`,
            });
        } catch (error) {
            await this.vizJobService.markAsFailed(job.id);
            throw error;
        }

        const res = new CreateVisualizationResDTO();
        res.jobId = job.id;
        return res;
    }

    async getSlides(userId: number, jobId: string): Promise<VisualizationSlidesResDTO> {
        const job = await this.vizJobService.findByIdAndUserIdOrThrow(jobId, userId);
        const slides = await this.vizSlideService.findAllByJobId(jobId);
        const exportStatus = computeCanExport(job, slides);
        const slideItems = await Promise.all(
            slides.map(async (slide) => {
                let previewUrl: string | null = null;
                if (slide.gcsPreviewKey) {
                    try {
                        previewUrl = await this.storagePort.getSignedUrl(
                            slide.gcsPreviewKey,
                            PREVIEW_TTL_SECONDS
                        );
                    } catch {
                        previewUrl = null;
                    }
                }
                return VisualizationSlideItemResDTO.from(slide, previewUrl);
            })
        );

        return VisualizationSlidesResDTO.from({
            jobStatus: job.status,
            pipelineStage: job.pipelineStage,
            exportStatus,
            remainingRegenerations: Math.max(MAX_REGENERATIONS - (job.regenerationCount ?? 0), 0),
            slides: slideItems,
        });
    }

    async getExportStatus(userId: number, jobId: string): Promise<VisualizationExportStatusResDTO> {
        const job = await this.vizJobService.findByIdAndUserIdOrThrow(jobId, userId);
        const slides = await this.vizSlideService.findAllByJobId(jobId);
        return VisualizationExportStatusResDTO.from(computeCanExport(job, slides));
    }

    async export(userId: number, jobId: string): Promise<VisualizationExportResDTO> {
        const job = await this.vizJobService.findByIdAndUserIdOrThrow(jobId, userId);
        const slides = await this.vizSlideService.findAllByJobId(jobId);
        const exportStatus = computeCanExport(job, slides);

        if (!exportStatus.canExport || !job.gcsPptxKey) {
            throw new BusinessException(ErrorCode.VISUALIZATION_EXPORT_BLOCKED, {
                blockingSlides: exportStatus.blockingSlides,
                blockingReasons: exportStatus.blockingReasons,
            });
        }

        const expiresAt = new Date(Date.now() + EXPORT_TTL_SECONDS * 1000).toISOString();
        const pdfKey = `jobs/${jobId}/current.pdf`;
        const [pptxUrl, pdfUrl] = await Promise.all([
            this.storagePort.getSignedUrl(job.gcsPptxKey, EXPORT_TTL_SECONDS),
            this.storagePort.getSignedUrl(pdfKey, EXPORT_TTL_SECONDS),
        ]);

        return VisualizationExportResDTO.from({ pptxUrl, pdfUrl, expiresAt });
    }
}
