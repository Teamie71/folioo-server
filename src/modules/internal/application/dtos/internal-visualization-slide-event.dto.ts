import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsString,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

export enum SlideEventType {
    SLIDE_CONTENT_READY = 'slide_content_ready',
    SLIDE_CONTENT_ERROR = 'slide_content_error',
    SLIDE_PREVIEW_READY = 'slide_preview_ready',
    SLIDE_PREVIEW_ERROR = 'slide_preview_error',
    SLIDE_REGENERATED = 'slide_regenerated',
}

export const COMPLETING_EVENTS: SlideEventType[] = [
    SlideEventType.SLIDE_PREVIEW_READY,
    SlideEventType.SLIDE_REGENERATED,
];

function isReadyEvent(o: SlideEventCallbackReqDTO): boolean {
    return [
        SlideEventType.SLIDE_CONTENT_READY,
        SlideEventType.SLIDE_PREVIEW_READY,
        SlideEventType.SLIDE_REGENERATED,
    ].includes(o.event);
}

function isPreviewEvent(o: SlideEventCallbackReqDTO): boolean {
    return COMPLETING_EVENTS.includes(o.event);
}

function isErrorEvent(o: SlideEventCallbackReqDTO): boolean {
    return (
        o.event === SlideEventType.SLIDE_CONTENT_ERROR ||
        o.event === SlideEventType.SLIDE_PREVIEW_ERROR
    );
}

export class SlideEventCallbackReqDTO {
    @IsEnum(SlideEventType)
    @ApiProperty({ enum: SlideEventType, description: '슬라이드 이벤트 종류' })
    event: SlideEventType;

    @IsInt()
    @Min(1)
    @ApiProperty({ description: '슬라이드 순서 (1-indexed)', example: 3 })
    slideOrder: number;

    @ValidateIf(isReadyEvent)
    @IsObject()
    @IsNotEmpty()
    @ApiPropertyOptional({ description: 'LLM 채워넣기 결과 (ready 이벤트 시 필수)' })
    currentFills?: Record<string, unknown>;

    @ValidateIf(isPreviewEvent)
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiPropertyOptional({
        description: 'GCS 오브젝트 키 (preview_ready·regenerated 시 필수)',
        example: 'jobs/{job_id}/previews/slide-03.jpg',
    })
    gcsPreviewKey?: string;

    @ValidateIf(isErrorEvent)
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiPropertyOptional({ description: '에러 메시지 (error 이벤트 시 필수)' })
    message?: string;

    @ValidateIf(isErrorEvent)
    @IsBoolean()
    @ApiPropertyOptional({ description: '재시도 가능 여부 (error 이벤트 시 필수)' })
    retryable?: boolean;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: '이벤트 발생 시각 (ISO 8601)', example: '2026-05-17T03:42:01Z' })
    occurredAt: string;

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
