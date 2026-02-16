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
import {
    UpdateCompanyInsightReqDTO,
    UpdateCompanyInsightResDTO,
} from '../dtos/company-insight.dto';
import { JobDescriptionType } from '../../domain/enums/jobdescription-type.enum';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';
import { CorrectionItemService } from './correction-item.service';
import { UpdateCorrectionTitleReqDTO } from '../dtos/portfolio-correction.dto';

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

    async requestCompanyInsightCreation(correctionId: number, userId: number): Promise<void> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);

        if (correction.companyInsight !== null) {
            throw new BusinessException(ErrorCode.COMPANY_INSIGHT_ALREADY_EXISTS);
        }

        if (correction.status === CorrectionStatus.COMPANY_INSIGHT) {
            return;
        }

        correction.status = CorrectionStatus.COMPANY_INSIGHT;
        await this.portfolioCorrectionRepository.save(correction);
    }

    async updateCompanyInsight(
        correctionId: number,
        userId: number,
        dto: UpdateCompanyInsightReqDTO
    ): Promise<UpdateCompanyInsightResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);

        if (dto.companyInsight !== undefined && correction.companyInsight === null) {
            throw new BusinessException(ErrorCode.COMPANY_INSIGHT_NOT_READY);
        }

        if (dto.companyInsight !== undefined) {
            correction.companyInsight = dto.companyInsight;
        }
        if (dto.highlightPoint !== undefined) {
            correction.highlightPoint = dto.highlightPoint;
        }

        const saved = await this.portfolioCorrectionRepository.save(correction);
        return UpdateCompanyInsightResDTO.from(saved);
    }

    async getCorrectionDetail(
        correctionId: number,
        userId: number
    ): Promise<CorrectionResultResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        const items = await this.correctionItemService.findByCorrectionId(correctionId);
        return CorrectionResultResDTO.from(correction, items);
    }

    async updateTitle(
        correctionId: number,
        userId: number,
        body: UpdateCorrectionTitleReqDTO
    ): Promise<CorrectionResDTO> {
        const correction = await this.findByIdAndUserIdOrThrow(correctionId, userId);
        correction.title = body.title;
        const saved = await this.portfolioCorrectionRepository.save(correction);
        return CorrectionResDTO.from(saved);
    }

    async deleteCorrection(correctionId: number, userId: number): Promise<void> {
        await this.findByIdAndUserIdOrThrow(correctionId, userId);
        await this.correctionItemService.deleteByCorrectionId(correctionId);

        const affected = await this.portfolioCorrectionRepository.deleteById(correctionId);
        if (affected === 0) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
    }
}
