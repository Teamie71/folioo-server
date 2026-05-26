import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    VisualizationJob,
    SlidePlan,
} from 'src/modules/visualization/domain/visualization-job.entity';
import { VisualizationJobStatus } from 'src/modules/visualization/domain/enums/visualization-job-status.enum';
import { PipelineStage } from 'src/modules/visualization/domain/enums/pipeline-stage.enum';
import {
    VisualizationSlide,
    CurrentFills,
} from 'src/modules/visualization/domain/visualization-slide.entity';
import { VisualizationSlideStatus } from 'src/modules/visualization/domain/enums/visualization-slide-status.enum';

export class SlideItemReqDTO {
    @IsInt()
    @Min(1)
    @ApiProperty({ description: '슬라이드 순서 (1-indexed)', example: 1 })
    slideOrder: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @ApiProperty({ description: '소스 슬라이드 ID', example: 'cover_B' })
    sourceSlideId: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @ApiProperty({ description: '슬라이드 XML 파일명', example: 'slide1.xml' })
    slideFilename: string;
}

export class SaveSlidePlanReqDTO {
    @IsInt()
    @Min(1)
    @ApiProperty({ description: '총 슬라이드 수', example: 8 })
    totalSlides: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @ApiProperty({ description: '템플릿 ID', example: 'blue' })
    templateId: string;

    @IsObject()
    @ApiProperty({ description: '슬라이드 플랜 JSON (§10.2 slide_plan)' })
    slidePlan: Record<string, unknown>;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlideItemReqDTO)
    @ApiProperty({ type: [SlideItemReqDTO], description: '슬라이드 목록' })
    slides: SlideItemReqDTO[];

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @ApiProperty({ description: '멱등성 키', example: 'evt-uuid' })
    idempotencyKey: string;

    @IsInt()
    @Min(1)
    @ApiProperty({ description: '스키마 버전', example: 1 })
    schemaVersion: number;
}

export class InternalVisualizationJobResDTO {
    @ApiProperty({ description: 'job UUID' })
    id: string;

    @ApiProperty({ description: '포트폴리오 ID' })
    portfolioId: number;

    @ApiProperty({ description: '포트폴리오 텍스트 (워커 generate Step 1 입력용)' })
    portfolioText: string;

    @ApiProperty({ description: '유저 ID' })
    userId: number;

    @ApiProperty({ description: '템플릿 ID' })
    templateId: string;

    @ApiProperty({ enum: VisualizationJobStatus })
    status: VisualizationJobStatus;

    @ApiProperty({ enum: PipelineStage })
    pipelineStage: PipelineStage;

    @ApiProperty()
    totalSlides: number;

    @ApiProperty()
    regenerationCount: number;

    @ApiProperty({ nullable: true })
    gcsPptxKey: string | null;

    @ApiProperty({ nullable: true })
    slidePlan: SlidePlan | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static from(job: VisualizationJob): InternalVisualizationJobResDTO {
        const dto = new InternalVisualizationJobResDTO();
        dto.id = job.id;
        dto.portfolioId = job.portfolio.id;
        dto.portfolioText = [
            job.portfolio.description,
            job.portfolio.responsibilities,
            job.portfolio.problemSolving,
            job.portfolio.learnings,
        ]
            .filter(Boolean)
            .join('\n\n');
        dto.userId = job.user.id;
        dto.templateId = job.templateId;
        dto.status = job.status;
        dto.pipelineStage = job.pipelineStage;
        dto.totalSlides = job.totalSlides;
        dto.regenerationCount = job.regenerationCount;
        dto.gcsPptxKey = job.gcsPptxKey;
        dto.slidePlan = job.slidePlan;
        dto.createdAt = job.createdAt;
        dto.updatedAt = job.updatedAt;
        return dto;
    }
}

export class InternalVisualizationSlideResDTO {
    @ApiProperty({ description: '슬라이드 UUID' })
    id: string;

    @ApiProperty({ description: '잡 UUID' })
    jobId: string;

    @ApiProperty()
    slideOrder: number;

    @ApiProperty()
    sourceSlideId: string;

    @ApiProperty()
    slideFilename: string;

    @ApiProperty({ enum: VisualizationSlideStatus })
    status: VisualizationSlideStatus;

    @ApiProperty({ nullable: true })
    currentFills: CurrentFills | null;

    @ApiProperty({ nullable: true })
    gcsPreviewKey: string | null;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static from(slide: VisualizationSlide, jobId: string): InternalVisualizationSlideResDTO {
        const dto = new InternalVisualizationSlideResDTO();
        dto.id = slide.id;
        dto.jobId = jobId;
        dto.slideOrder = slide.slideOrder;
        dto.sourceSlideId = slide.sourceSlideId;
        dto.slideFilename = slide.slideFilename;
        dto.status = slide.status;
        dto.currentFills = slide.currentFills;
        dto.gcsPreviewKey = slide.gcsPreviewKey;
        dto.createdAt = slide.createdAt;
        dto.updatedAt = slide.updatedAt;
        return dto;
    }
}
