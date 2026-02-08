import { ApiProperty } from '@nestjs/swagger';
import { JobCategory } from 'src/modules/experience/domain/enums/job-category.enum';

export class PortfolioDetailResDTO {
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.DEV })
    hopeJob: JobCategory;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number;
}

export class UpdatePortfolioReqDTO {
    name?: string;
    contributionRate?: number;
}

export class ExportPortfolioResDTO {
    @ApiProperty({ example: 'https://example.pdf' })
    url: string;
}
