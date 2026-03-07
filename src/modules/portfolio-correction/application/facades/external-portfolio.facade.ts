import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { PdfExtractService } from '../services/pdf-extract.service';
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
        private readonly portfolioService: PortfolioService,
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionPortfolioSelectionService: CorrectionPortfolioSelectionService,
        private readonly pdfExtractService: PdfExtractService
    ) {}

    async extractPortfolio(
        userId: number,
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<string> {
        const extractedText = await this.pdfExtractService.extractText(fileBuffer, fileName);
        await this.portfolioCorrectionService.saveExtractedText(
            correctionId,
            userId,
            extractedText
        );
        return extractedText;
    }

    async getSelectedPortfolios(correctionId: number): Promise<StructuredPortfolioResDTO[]> {
        await this.portfolioCorrectionService.findByIdOrThrow(correctionId);

        const portfolioIds =
            await this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            );

        if (portfolioIds.length === 0) {
            return [];
        }

        const portfolios = await this.portfolioService.findByIds(portfolioIds);
        return portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const activePortfolioIds =
            await this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            );
        const currentCount = activePortfolioIds.length;

        if (currentCount >= MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const activePortfolios =
            activePortfolioIds.length === 0
                ? []
                : await this.portfolioService.findByIdsAndUserIdOrThrow(activePortfolioIds, userId);

        const savedPortfolio = await this.externalPortfolioService.createEmptyPortfolio(userId);
        await this.correctionPortfolioSelectionService.activateSelections(correction, [
            ...activePortfolios,
            savedPortfolio,
        ]);

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
