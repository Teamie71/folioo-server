import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import {
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../dtos/external-portfolio.dto';
import { MAX_EXTERNAL_PORTFOLIO_BLOCKS } from 'src/modules/portfolio/domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly externalPortfolioService: ExternalPortfolioService,
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionItemService: CorrectionItemService
    ) {}

    async getExternalPortfolios(correctionId: number): Promise<StructuredPortfolioResDTO[]> {
        await this.portfolioCorrectionService.findByIdOrThrow(correctionId);
        const portfolioIds =
            await this.correctionItemService.findPortfolioIdsByCorrectionId(correctionId);
        const portfolios = await this.externalPortfolioService.getExternalPortfolios(portfolioIds);
        return portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdOrThrow(correctionId);

        const currentCount =
            await this.correctionItemService.countItemsByCorrectionId(correctionId);
        if (currentCount >= MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const savedPortfolio = await this.externalPortfolioService.createEmptyPortfolio(userId);
        await this.correctionItemService.createCorrectionItem(savedPortfolio, correction);

        return StructuredPortfolioResDTO.from(savedPortfolio);
    }

    @Transactional()
    async updateExternalPortfolio(
        portfolioId: number,
        body: UpdatePortfolioBlockReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        const updatedPortfolio = await this.externalPortfolioService.updateExternalPortfolio(
            portfolioId,
            body
        );
        return StructuredPortfolioResDTO.from(updatedPortfolio);
    }

    @Transactional()
    async deleteExternalPortfolio(portfolioId: number): Promise<void> {
        const portfolio = await this.externalPortfolioService.findExternalByIdOrThrow(portfolioId);
        if (!this.externalPortfolioService.isEmptyPortfolio(portfolio)) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_EMPTY);
        }

        await this.externalPortfolioService.deleteExternalPortfolio(portfolioId);
    }
}
