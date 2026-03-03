import { ApiProperty } from '@nestjs/swagger';
import { Insight } from '../../../insight/domain/entities/insight.entity';
import { InsightCategory } from '../../../insight/domain/enums/insight-category.enum';
import { InsightLogResDTO } from '../../../insight/application/dtos/insight-log.dto';

export class InternalInsightDetailResDTO {
    id: number;
    title: string;
    description: string;
    @ApiProperty({ enum: InsightCategory, example: InsightCategory.ETC })
    category: InsightCategory;
    activityNames: string[];
    @ApiProperty({
        description: '코사인 유사도 (0~1, 1에 가까울수록 유사)',
        nullable: true,
        example: 0.78,
    })
    similarityScore: number | null;

    static from(insight: Insight, activityNames: string[]): InternalInsightDetailResDTO {
        const dto = new InternalInsightDetailResDTO();
        dto.id = insight.id;
        dto.title = insight.title;
        dto.description = insight.description;
        dto.category = insight.category;
        dto.activityNames = activityNames;
        dto.similarityScore = null;
        return dto;
    }

    static fromLogRes(
        log: InsightLogResDTO,
        similarityScore?: number
    ): InternalInsightDetailResDTO {
        const dto = new InternalInsightDetailResDTO();
        dto.id = log.id;
        dto.title = log.title;
        dto.description = log.description;
        dto.category = log.category;
        dto.activityNames = log.activityNames;
        dto.similarityScore = similarityScore ?? null;
        return dto;
    }
}
