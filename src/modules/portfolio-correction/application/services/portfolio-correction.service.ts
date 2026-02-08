import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import {
    MAX_CORRECTIONS_PER_USER,
    PortfolioCorrection,
} from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CorrectionResDTO } from '../dtos/portfolio-correction.dto';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';

@Injectable()
export class PortfolioCorrectionService {
    constructor(private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository) {}

    async getCorrections(userId: number, keyword?: string): Promise<CorrectionResDTO[]> {
        const corrections = await this.portfolioCorrectionRepository.findAllByUserIdAndTitleKeyword(
            userId,
            keyword
        );
        return corrections.map((correction) => CorrectionResDTO.from(correction));
    }

    async validateCreation(userId: number): Promise<void> {
        const count = await this.portfolioCorrectionRepository.countByUserId(userId);
        if (count >= MAX_CORRECTIONS_PER_USER) {
            throw new BusinessException(ErrorCode.CORRECTION_MAX_LIMIT);
        }
    }

    createCorrection(
        userId: number,
        companyName: string,
        positionName: string,
        jobDescription: string,
        jobDescriptionType: JobDescriptionType
    ): Promise<PortfolioCorrection> {
        const correction = PortfolioCorrection.create(
            userId,
            companyName,
            positionName,
            jobDescription,
            jobDescriptionType
        );
        return this.portfolioCorrectionRepository.save(correction);
    }

    async findByIdOrThrow(correctionId: number): Promise<PortfolioCorrection> {
        return this.portfolioCorrectionRepository.findByIdOrThrow(correctionId);
    }
}
