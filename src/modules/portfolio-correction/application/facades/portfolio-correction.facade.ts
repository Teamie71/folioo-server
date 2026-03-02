import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { MAX_EXTERNAL_PORTFOLIO_BLOCKS } from 'src/modules/portfolio/domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CorrectionSelectionResDTO,
    CreateCorrectionReqDTO,
} from '../dtos/portfolio-correction.dto';
import { CorrectionItemResDTO } from '../dtos/correction-result.dto';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import { CorrectionPortfolioSelectionService } from '../services/correction-portfolio-selection.service';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';

@Injectable()
export class PortfolioCorrectionFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly ticketService: TicketService,
        private readonly correctionItemService: CorrectionItemService,
        private readonly externalPortfolioService: ExternalPortfolioService,
        private readonly correctionPortfolioSelectionService: CorrectionPortfolioSelectionService
    ) {}

    @Transactional()
    async requestCorrection(userId: number, body: CreateCorrectionReqDTO): Promise<number> {
        await this.ticketService.consumeTicket(userId, TicketType.PORTFOLIO_CORRECTION);
        await this.portfolioCorrectionService.validateCreation(userId);
        const correction = await this.portfolioCorrectionService.createCorrection(
            userId,
            body.companyName,
            body.positionName,
            body.jobDescription ?? '',
            body.jobDescriptionType
        );

        return correction.id;
    }

    @Transactional()
    async selectPortfolios(
        correctionId: number,
        userId: number,
        portfolioIds: number[]
    ): Promise<CorrectionSelectionResDTO[]> {
        const { correction, portfolios } = await this.resolveSelectionTargets(
            correctionId,
            userId,
            portfolioIds
        );

        const selections = await this.correctionPortfolioSelectionService.activateSelections(
            correction,
            portfolios
        );

        return selections.map((selection) => CorrectionSelectionResDTO.from(selection));
    }

    @Transactional()
    async selectAndGenerate(correctionId: number, userId: number): Promise<CorrectionItemResDTO[]> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );
        const activePortfolioIds =
            await this.correctionPortfolioSelectionService.findActivePortfolioIdsByCorrectionId(
                correctionId
            );

        if (activePortfolioIds.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'At least one portfolio must be selected before generation.',
            });
        }

        const portfolios = await this.externalPortfolioService.getExternalPortfoliosByOwnerOrThrow(
            activePortfolioIds,
            userId
        );
        const items = await this.replaceCorrectionItems(correctionId, correction, portfolios);
        await this.portfolioCorrectionService.transitionToGenerating(correctionId);

        return items;
    }

    private async resolveSelectionTargets(
        correctionId: number,
        userId: number,
        portfolioIds: number[]
    ): Promise<{ correction: PortfolioCorrection; portfolios: Portfolio[] }> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const uniqueIds = [...new Set(portfolioIds)];

        if (uniqueIds.length > MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const portfolios = await this.externalPortfolioService.getExternalPortfoliosByOwnerOrThrow(
            uniqueIds,
            userId
        );

        return { correction, portfolios };
    }

    private async replaceCorrectionItems(
        correctionId: number,
        correction: PortfolioCorrection,
        portfolios: Portfolio[]
    ): Promise<CorrectionItemResDTO[]> {
        await this.correctionItemService.deleteByCorrectionId(correctionId);

        const items = await Promise.all(
            portfolios.map((portfolio) =>
                this.correctionItemService.createCorrectionItem(portfolio, correction)
            )
        );

        return items.map((item) => CorrectionItemResDTO.from(item));
    }
}
