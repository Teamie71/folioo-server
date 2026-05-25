import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PipelineStage } from 'src/modules/visualization/domain/enums/pipeline-stage.enum';

export enum JobEventType {
    PIPELINE_STAGE_CHANGED = 'pipeline_stage_changed',
    ALL_COMPLETED = 'all_completed',
}

class CompletionSummaryDTO {
    @IsInt()
    @Min(0)
    @ApiProperty({ description: '완료된 슬라이드 수', example: 7 })
    completed: number;

    @IsInt()
    @Min(0)
    @ApiProperty({ description: '실패한 슬라이드 수', example: 1 })
    failed: number;
}

export class JobEventCallbackReqDTO {
    @IsEnum(JobEventType)
    @ApiProperty({ enum: JobEventType, description: '잡 이벤트 타입' })
    event: JobEventType;

    @ValidateIf((o: JobEventCallbackReqDTO) => o.event === JobEventType.PIPELINE_STAGE_CHANGED)
    @IsEnum(PipelineStage)
    @ApiPropertyOptional({
        enum: PipelineStage,
        description: 'event=pipeline_stage_changed 시 갱신할 파이프라인 단계',
    })
    pipelineStage?: PipelineStage;

    @ValidateIf((o: JobEventCallbackReqDTO) => o.event === JobEventType.ALL_COMPLETED)
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiPropertyOptional({
        description: 'event=all_completed 시 생성된 PPTX GCS 키',
        example: 'jobs/uuid/current.pptx',
    })
    gcsPptxKey?: string;

    @ValidateIf((o: JobEventCallbackReqDTO) => o.event === JobEventType.ALL_COMPLETED)
    @ValidateNested()
    @Type(() => CompletionSummaryDTO)
    @ApiPropertyOptional({
        type: CompletionSummaryDTO,
        description: 'event=all_completed 시 슬라이드 완료 요약',
    })
    summary?: CompletionSummaryDTO;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    @ApiPropertyOptional({
        description: '전체 파이프라인 실패 시 에러 코드',
        example: 'TEMPLATE_FETCH_FAILED',
    })
    errorCode?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @ApiProperty({ description: '멱등성 키', example: 'evt-uuid' })
    idempotencyKey: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: '이벤트 발생 시각 (ISO 8601)', example: '2026-05-25T00:00:00Z' })
    occurredAt: string;

    @IsInt()
    @Min(1)
    @ApiProperty({ description: '스키마 버전', example: 1 })
    schemaVersion: number;
}
