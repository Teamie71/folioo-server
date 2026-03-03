import { ApiProperty } from '@nestjs/swagger';
import { Insight } from '../../../insight/domain/entities/insight.entity';
import { InsightCategory } from '../../../insight/domain/enums/insight-category.enum';

export class InternalInsightDetailResDTO {
    id: number;
    title: string;
    description: string;
    @ApiProperty({ enum: InsightCategory, example: InsightCategory.ETC })
    category: InsightCategory;
    activityNames: string[];

    static from(insight: Insight, activityNames: string[]): InternalInsightDetailResDTO {
        const dto = new InternalInsightDetailResDTO();
        dto.id = insight.id;
        dto.title = insight.title;
        dto.description = insight.description;
        dto.category = insight.category;
        dto.activityNames = activityNames;
        return dto;
    }
}
