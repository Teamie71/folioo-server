import { ApiProperty } from '@nestjs/swagger';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';

export class CorrectionResDto {
    id: number;
    title: string;
    positionName: string;
    createdAt: string;
}

export class CreateCorrectionReqDto {
    companyName: string;
    positionName: string;
    jobDescription?: string;
    @ApiProperty({ enum: JobDescriptionType, example: JobDescriptionType.TEXT })
    jobDescriptionType: JobDescriptionType;
}

export class CorrectionStatusResDto {
    id: number;
    @ApiProperty({ enum: CorrectionStatus, example: CorrectionStatus.GENERATING })
    status: CorrectionStatus;
}

export class MapCorrectionWithPortfoliosReqDto {
    @ApiProperty({ isArray: true, example: [1, 2, 3] })
    portfolioIds: number[];
}

export class UpdateCorrectionTitleReqDto {
    title: string;
}
