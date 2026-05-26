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
