import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ExternalPortfolioService } from '../services/external-portfolio.service';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { StructuredPortfolioResDTO } from '../dtos/external-portfolio.dto';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { MAX_EXTERNAL_PORTFOLIO_BLOCKS } from '../../domain/portfolio.entity';

@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly externalPortfolioService: ExternalPortfolioService,
        private readonly portfolioCorrectionService: PortfolioCorrectionService
    ) {}

    async getExternalPortfolios(correctionId: number): Promise<StructuredPortfolioResDTO[]> {
        await this.portfolioCorrectionService.findByIdOrThrow(correctionId);
        return this.externalPortfolioService.getExternalPortfolios(correctionId);
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdOrThrow(correctionId);

        const currentCount =
            await this.externalPortfolioService.countExternalByCorrectionId(correctionId);
        if (currentCount >= MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const savedPortfolio = await this.externalPortfolioService.createEmptyPortfolio(userId);

        const correctionItem = new CorrectionItem();
        correctionItem.portfolio = savedPortfolio;
        correctionItem.portfolioCorrection = correction;
        await this.portfolioCorrectionService.saveCorrectionItem(correctionItem);

        return StructuredPortfolioResDTO.from(savedPortfolio);
    }
}
