import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { JobCategory } from 'src/modules/experience/domain/enums/job-category.enum';
import { Portfolio } from '../../domain/portfolio.entity';

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
    @ApiPropertyOptional({ description: '포트폴리오 이름', example: '포트폴리오 이름' })
    @IsOptional()
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    name?: string;

    @ApiPropertyOptional({
        description: '기여도(0~100). 입력하지 않으면 기존 값을 유지합니다.',
        example: 80,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsInt()
    @Min(0)
    @Max(100)
    contributionRate?: number;
}

export class ExportPortfolioResDTO {
    @ApiProperty({ example: 'https://example.pdf' })
    url: string;
}
