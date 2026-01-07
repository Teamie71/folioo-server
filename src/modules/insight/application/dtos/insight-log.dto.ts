import { ApiProperty } from '@nestjs/swagger';
import { InsightCategory } from '../../domain/enums/insight-category.enum';

export class InsightLogResDTO {
    title: string;
    description: string;
    @ApiProperty({ enum: InsightCategory, example: InsightCategory.ETC })
    category: InsightCategory;
    activityName: string;
    @ApiProperty({ example: '2026-01-02T12:34:56.000Z' })
    createdAt: string;
}

export class CreateInsightLogReqDTO {
    title: string;
    description: string;
    category: InsightCategory;
    activitId: number;
}

export class UpdateInsightLogReqDTO {
    title?: string;
    description?: string;
    category?: InsightCategory;
    activityId?: number;
}
