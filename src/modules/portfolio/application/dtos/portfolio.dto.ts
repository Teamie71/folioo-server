import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { JobCategory } from 'src/modules/experience/domain/enums/job-category.enum';
import { Portfolio } from '../../domain/portfolio.entity';

export class PortfolioListResDTO {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: '마케팅 인턴 경험' })
    name: string;

    @ApiProperty({ enum: JobCategory, example: JobCategory.DEV, nullable: true })
    hopeJob: JobCategory | null;

    @ApiProperty({ example: '2026-01-02T12:34:56.000Z' })
    createdAt: string;

    static from(portfolio: Portfolio): PortfolioListResDTO {
        const dto = new PortfolioListResDTO();
        dto.id = portfolio.id;
        dto.name = portfolio.name;
        dto.hopeJob = portfolio.experience?.hopeJob ?? null;
        dto.createdAt = portfolio.createdAt.toISOString();
        return dto;
    }
}

export class PortfolioDetailResDTO {
    id: number;
    name: string;
    @ApiProperty({ enum: JobCategory, example: JobCategory.DEV, nullable: true })
    hopeJob: JobCategory | null;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number | null;
    createdAt: string;

    static from(portfolio: Portfolio): PortfolioDetailResDTO {
        const dto = new PortfolioDetailResDTO();
        dto.id = portfolio.id;
        dto.name = portfolio.name;
        dto.hopeJob = portfolio.experience?.hopeJob ?? null;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        dto.contributionRate = portfolio.contributionRate ?? null;
        dto.createdAt = portfolio.createdAt.toISOString();
        return dto;
    }
}

export class UpdatePortfolioReqDTO {
    @ApiPropertyOptional({
        description: '기여도(0~100). 입력하지 않으면 기존 값을 유지합니다.',
        example: 80,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(100)
    contributionRate?: number;
}
