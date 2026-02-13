import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';

export class UpdateCompanyInsightReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MaxLength(1500)
    @ApiProperty({ required: false, nullable: true, maxLength: 1500 })
    companyInsight?: string;

    @Transform(({ value }: { value: string }) => value?.trim())
    @IsOptional()
    @IsString()
    @MaxLength(200)
    @ApiProperty({ required: false, nullable: true, maxLength: 200 })
    highlightPoint?: string;
}

export class UpdateCompanyInsightResDTO {
    @ApiProperty({ nullable: true })
    id: number;

    @ApiProperty({ nullable: true, maxLength: 1500 })
    companyInsight: string | null;

    @ApiProperty({ nullable: true, maxLength: 200 })
    highlightPoint: string | null;

    static from(correction: PortfolioCorrection): UpdateCompanyInsightResDTO {
        const dto = new UpdateCompanyInsightResDTO();
        dto.id = correction.id;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        return dto;
    }
}
