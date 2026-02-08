import { ApiProperty, PartialType } from '@nestjs/swagger';
import { InsightCategory } from '../../domain/enums/insight-category.enum';
import {
    ArrayUnique,
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';
import { Insight } from '../../domain/entities/insight.entity';

export class InsightLogResDto {
    title: string;
    description: string;
    @ApiProperty({ enum: InsightCategory, example: InsightCategory.ETC })
    category: InsightCategory;
    activityNames: string[];
    @ApiProperty({ example: '2026-01-02T12:34:56.000Z' })
    createdAt: string;

    static from(insight: Insight, activityNames: string[]): InsightLogResDto {
        const dto = new InsightLogResDto();
        dto.title = insight.title;
        dto.description = insight.description;
        dto.category = insight.category;
        dto.activityNames = activityNames;
        dto.createdAt = insight.createdAt.toISOString();
        return dto;
    }
}

export class DeletedInsightLogResDto {
    id: number;

    static from(id: number): DeletedInsightLogResDto {
        const dto = new DeletedInsightLogResDto();
        dto.id = id;
        return dto;
    }
}

export class CreateInsightLogReqDto {
    @IsString()
    @IsNotEmpty({ message: '제목은 필수입니다.' })
    @MaxLength(20, { message: '제목은 20자를 초과할 수 없습니다.' })
    @ApiProperty({ example: '인사이트 제목' })
    title: string;

    @IsString()
    @MaxLength(250)
    @IsNotEmpty()
    @ApiProperty({ example: '오늘은 어떤 인사이트를 얻으셨나요?' })
    description: string;

    @ApiProperty({ enum: InsightCategory, example: InsightCategory.ETC })
    @IsEnum(InsightCategory, { message: '유효하지 않은 카테고리입니다.' })
    category: InsightCategory;

    @IsArray({ message: 'activityIds는 배열이어야 합니다.' })
    @ArrayUnique({ message: '중복된 활동 ID가 있습니다.' })
    @IsInt({ each: true, message: '각 활동 ID는 정수여야 합니다.' })
    @IsPositive({ each: true, message: '각 활동 ID는 양수여야 합니다.' })
    @ApiProperty({ isArray: true, example: [1, 2] })
    activityIds: number[];
}

export class UpdateInsightReqDto extends PartialType(CreateInsightLogReqDto) {}
