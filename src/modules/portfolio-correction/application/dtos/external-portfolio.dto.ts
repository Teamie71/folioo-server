import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';

function normalizeOriginalFileNameForResponse(originalFileName: string | null): string | null {
    if (originalFileName === null) {
        return null;
    }

    const decodeLatin1 = (value: string): string => Buffer.from(value, 'latin1').toString('utf8');
    const once = decodeLatin1(originalFileName);
    const twice = decodeLatin1(once);

    const hasHangul = (value: string): boolean =>
        /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(value);
    const score = (value: string): number => {
        const matched = value.match(/[ÃÂáâãð�\u0080-\u009F]/g);
        return matched ? matched.length : 0;
    };

    const candidates = [originalFileName, once, twice]
        .filter((value) => !value.includes('�'))
        .map((value) => value.normalize('NFC'));
    if (candidates.length === 0) {
        return originalFileName.normalize('NFC');
    }

    const uniqueCandidates = [...new Set(candidates)];
    const withKorean = uniqueCandidates.filter((value) => hasHangul(value));
    const pool = withKorean.length > 0 ? withKorean : uniqueCandidates;

    const selected = pool.reduce((best, current) =>
        score(current) < score(best) ? current : best
    );

    return selected.normalize('NFC');
}

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

export class ExternalPortfolioListResDTO {
    @ApiProperty({ enum: PdfExtractionStatus })
    status: PdfExtractionStatus;

    @ApiProperty({ nullable: true })
    originalFileName: string | null;

    @ApiProperty({ type: [StructuredPortfolioResDTO] })
    portfolios: StructuredPortfolioResDTO[];

    static from(
        status: PdfExtractionStatus,
        originalFileName: string | null,
        portfolios: Portfolio[]
    ): ExternalPortfolioListResDTO {
        const dto = new ExternalPortfolioListResDTO();
        dto.status = status;
        dto.originalFileName = normalizeOriginalFileNameForResponse(originalFileName);
        dto.portfolios = portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
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
