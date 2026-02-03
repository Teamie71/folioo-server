import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';

export class StructuredPortfolioResDto {
    portfolioId: number;
    name: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;

    static from(portfolio: Portfolio): StructuredPortfolioResDto {
        const dto = new StructuredPortfolioResDto();
        dto.portfolioId = portfolio.id;
        dto.name = portfolio.name;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        return dto;
    }
}

export class CreateExternalPortfolioReqDto {
    @IsInt()
    @IsPositive()
    correctionId: number;
}

export class UpdatePortfolioBlockReqDto {
    @IsOptional()
    @IsString()
    @MaxLength(20)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(400)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(400)
    responsibilities?: string;

    @IsOptional()
    @IsString()
    @MaxLength(400)
    problemSolving?: string;

    @IsOptional()
    @IsString()
    @MaxLength(400)
    learnings?: string;
}
