import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import {
    MAX_CORRECTIONS_PER_USER,
    PortfolioCorrection,
} from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CorrectionResDTO, CorrectionStatusResDTO } from '../dtos/portfolio-correction.dto';
import { CorrectionResultResDTO } from '../dtos/correction-result.dto';
import { UpdateCompanyInsightResDTO } from '../dtos/company-insight.dto';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { CorrectionItemService } from './correction-item.service';

@Injectable()
export class PortfolioCorrectionService {
    constructor(
        private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository,
        private readonly correctionItemService: CorrectionItemService
    ) {}

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
        const correction = await this.portfolioCorrectionRepository.findById(correctionId);
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }

    async findByIdAndUserIdOrThrow(
        correctionId: number,
        userId: number
    ): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findByIdAndUserId(
            correctionId,
            userId
        );
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }

    async getStatus(correctionId: number, userId: number): Promise<CorrectionStatusResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        return CorrectionStatusResDTO.from(correction);
    }

    async getCompanyInsight(
        correctionId: number,
        userId: number
    ): Promise<UpdateCompanyInsightResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        return UpdateCompanyInsightResDTO.from(correction);
    }

    async getCorrectionDetail(
        correctionId: number,
        userId: number
    ): Promise<CorrectionResultResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        const items = await this.correctionItemService.findByCorrectionId(correctionId);
        return CorrectionResultResDTO.from(correction, items);
    }
}
