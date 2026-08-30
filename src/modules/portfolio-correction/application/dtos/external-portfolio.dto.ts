import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';
import { CorrectionMaterial } from '../../domain/correction-material.entity';
import { PdfExtractionStatus } from '../../domain/enums/pdf-extraction-status.enum';
import { normalizeOriginalFileName } from '../../common/utils/original-file-name-normalizer.util';

export class StructuredPortfolioResDTO {
    portfolioId: number;
    name: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;

    static from(material: CorrectionMaterial): StructuredPortfolioResDTO {
        const dto = new StructuredPortfolioResDTO();
        dto.portfolioId = material.id;
        dto.name = material.name;
        dto.description = material.description;
        dto.responsibilities = material.responsibilities;
        dto.problemSolving = material.problemSolving;
        dto.learnings = material.learnings;
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
        materials: CorrectionMaterial[]
    ): ExternalPortfolioListResDTO {
        const dto = new ExternalPortfolioListResDTO();
        dto.status = status;
        dto.originalFileName = originalFileName
            ? normalizeOriginalFileName(originalFileName)
            : null;
        dto.portfolios = materials.map((material) => StructuredPortfolioResDTO.from(material));
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
