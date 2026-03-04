import { ApiProperty } from '@nestjs/swagger';
import { InsightCategory } from '../../../insight/domain/enums/insight-category.enum';
import {
    InsightDetailPayload,
    InsightSimilarityPayload,
} from '../../../insight/application/dtos/insight-internal.dto';

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

    static from(payload: InsightDetailPayload): InternalInsightDetailResDTO {
        const { insight, activityNames } = payload;
        const dto = new InternalInsightDetailResDTO();
        dto.id = insight.id;
        dto.title = insight.title;
        dto.description = insight.description;
        dto.category = insight.category;
        dto.activityNames = activityNames;
        dto.similarityScore = null;
        return dto;
    }

    static fromSimilarity(payload: InsightSimilarityPayload): InternalInsightDetailResDTO {
        const dto = this.from(payload);
        dto.similarityScore = payload.similarityScore;
        return dto;
    }
}
