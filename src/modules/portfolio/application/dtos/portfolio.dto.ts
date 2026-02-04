import { ApiProperty } from '@nestjs/swagger';
import { JobCategory } from 'src/modules/experience/domain/enums/job-category.enum';

export class PortfolioDetailResDto {
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.DEV })
    hopeJob: JobCategory;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number;
}

export class UpdatePortfolioReqDto {
    name?: string;
    contributionRate?: number;
}

export class ExportPortfolioResDto {
    @ApiProperty({ example: 'https://example.pdf' })
    url: string;
}
