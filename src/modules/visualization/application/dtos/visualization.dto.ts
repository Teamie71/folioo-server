import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { PipelineStage } from '../../domain/enums/pipeline-stage.enum';
import { VisualizationJobStatus } from '../../domain/enums/visualization-job-status.enum';
import { VisualizationSlideStatus } from '../../domain/enums/visualization-slide-status.enum';
import { VisualizationSlide } from '../../domain/visualization-slide.entity';
import { CanExportResult } from '../utils/can-export.util';

export class CreateVisualizationReqDTO {
    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    portfolioId: number;

    @ApiProperty({ example: 'modern-clean' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    templateId: string;
}

export class CreateVisualizationResDTO {
    @ApiProperty({ example: 'b3e2f1a0-1234-5678-abcd-ef0123456789' })
    jobId: string;
}

export class VisualizationSlideItemResDTO {
    @ApiProperty({ example: 'b3e2f1a0-1234-5678-abcd-ef0123456789' })
    slideId: string;

    @ApiProperty({ example: 1 })
    slideOrder: number;

    @ApiProperty({ example: 'cover_B' })
    sourceSlideId: string;

    @ApiProperty({ enum: VisualizationSlideStatus, example: VisualizationSlideStatus.COMPLETED })
    status: VisualizationSlideStatus;

    @ApiProperty({
        nullable: true,
        example: 'https://storage.googleapis.com/folioo/jobs/uuid/previews/slide-01.jpg?...',
    })
    previewUrl: string | null;

    @ApiProperty({ nullable: true, example: null })
    errorMessage: string | null;

    static from(
        slide: VisualizationSlide,
        previewUrl: string | null
    ): VisualizationSlideItemResDTO {
        const dto = new VisualizationSlideItemResDTO();
        dto.slideId = slide.id;
        dto.slideOrder = slide.slideOrder;
        dto.sourceSlideId = slide.sourceSlideId;
        dto.status = slide.status;
        dto.previewUrl = previewUrl;
        dto.errorMessage = slide.errorMessage;
        return dto;
    }
}

export class VisualizationSlidesResDTO {
    @ApiProperty({ enum: VisualizationJobStatus, example: VisualizationJobStatus.GENERATING })
    jobStatus: VisualizationJobStatus;

    @ApiProperty({ enum: PipelineStage, example: PipelineStage.RENDERING })
    pipelineStage: PipelineStage;

    @ApiProperty({ example: false })
    canExport: boolean;

    @ApiProperty({ type: [Number], example: [3, 5] })
    blockingSlides: number[];

    @ApiProperty({
        example: {
            '3': 'regenerating',
            '5': 'error',
        },
    })
    blockingReasons: Record<string, string>;

    @ApiProperty({ example: 8 })
    remainingRegenerations: number;

    @ApiProperty({ type: [VisualizationSlideItemResDTO] })
    slides: VisualizationSlideItemResDTO[];

    static from(data: {
        jobStatus: VisualizationJobStatus;
        pipelineStage: PipelineStage;
        exportStatus: CanExportResult;
        remainingRegenerations: number;
        slides: VisualizationSlideItemResDTO[];
    }): VisualizationSlidesResDTO {
        const dto = new VisualizationSlidesResDTO();
        dto.jobStatus = data.jobStatus;
        dto.pipelineStage = data.pipelineStage;
        dto.canExport = data.exportStatus.canExport;
        dto.blockingSlides = data.exportStatus.blockingSlides;
        dto.blockingReasons = data.exportStatus.blockingReasons;
        dto.remainingRegenerations = data.remainingRegenerations;
        dto.slides = data.slides;
        return dto;
    }
}

export class VisualizationExportStatusResDTO {
    @ApiProperty({ example: false })
    canExport: boolean;

    @ApiProperty({ type: [Number], example: [3, 5] })
    blockingSlides: number[];

    @ApiProperty({
        example: {
            '3': 'regenerating',
            '5': 'error',
        },
    })
    blockingReasons: Record<string, string>;

    static from(exportStatus: CanExportResult): VisualizationExportStatusResDTO {
        const dto = new VisualizationExportStatusResDTO();
        dto.canExport = exportStatus.canExport;
        dto.blockingSlides = exportStatus.blockingSlides;
        dto.blockingReasons = exportStatus.blockingReasons;
        return dto;
    }
}

export class VisualizationExportResDTO {
    @ApiProperty({ example: 'https://storage.googleapis.com/folioo/jobs/uuid/current.pptx?...' })
    pptxUrl: string;

    @ApiProperty({ example: 'https://storage.googleapis.com/folioo/jobs/uuid/current.pdf?...' })
    pdfUrl: string;

    @ApiProperty({ example: '2026-05-25T12:05:00.000Z' })
    expiresAt: string;

    static from(data: {
        pptxUrl: string;
        pdfUrl: string;
        expiresAt: string;
    }): VisualizationExportResDTO {
        const dto = new VisualizationExportResDTO();
        dto.pptxUrl = data.pptxUrl;
        dto.pdfUrl = data.pdfUrl;
        dto.expiresAt = data.expiresAt;
        return dto;
    }
}
