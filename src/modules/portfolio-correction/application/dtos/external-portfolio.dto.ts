import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';

export class StructuredPortfolioResDTO {
    portfolioId: number;
    name: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;

    static from(portfolio: Portfolio): StructuredPortfolioResDTO {
        const dto = new StructuredPortfolioResDTO();
        dto.portfolioId = portfolio.id;
        dto.name = portfolio.name;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        return dto;
    }
}

export class CreateExternalPortfolioReqDTO {
    @IsInt()
    @IsPositive()
    correctionId: number;
}

export class UpdatePortfolioBlockReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(20)
    name?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(400)
    description?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(400)
    responsibilities?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(400)
    problemSolving?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(400)
    learnings?: string;
}
