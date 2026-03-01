import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { ExternalPortfolioService } from 'src/modules/portfolio/application/services/external-portfolio.service';
import { MAX_EXTERNAL_PORTFOLIO_BLOCKS } from 'src/modules/portfolio/domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CreateCorrectionReqDTO } from '../dtos/portfolio-correction.dto';
import { CorrectionItemResDTO } from '../dtos/correction-result.dto';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import { CorrectionItem } from '../../domain/correction-item.entity';

@Injectable()
export class PortfolioCorrectionFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly ticketService: TicketService,
        private readonly correctionItemService: CorrectionItemService,
        private readonly externalPortfolioService: ExternalPortfolioService
    ) {}

    @Transactional()
    async requestCorrection(userId: number, body: CreateCorrectionReqDTO): Promise<void> {
        await this.ticketService.consumeTicket(userId, TicketType.PORTFOLIO_CORRECTION);
        await this.portfolioCorrectionService.validateCreation(userId);
        await this.portfolioCorrectionService.createCorrection(
            userId,
            body.companyName,
            body.positionName,
            body.jobDescription ?? '',
            body.jobDescriptionType
        );
    }

    @Transactional()
    async selectPortfolios(
        correctionId: number,
        userId: number,
        portfolioIds: number[]
    ): Promise<CorrectionItemResDTO[]> {
        return this.mapPortfoliosToItems(correctionId, userId, portfolioIds);
    }

    @Transactional()
    async selectAndGenerate(
        correctionId: number,
        userId: number,
        portfolioIds: number[]
    ): Promise<CorrectionItemResDTO[]> {
        const items = await this.mapPortfoliosToItems(correctionId, userId, portfolioIds);
        await this.portfolioCorrectionService.transitionToGenerating(correctionId);
        return items;
    }

    private async mapPortfoliosToItems(
        correctionId: number,
        userId: number,
        portfolioIds: number[]
    ): Promise<CorrectionItemResDTO[]> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const uniqueIds = [...new Set(portfolioIds)];

        if (uniqueIds.length > MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const portfolios = await this.externalPortfolioService.getExternalPortfolios(uniqueIds);
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }

        await this.correctionItemService.deleteByCorrectionId(correctionId);

        const items: CorrectionItem[] = [];
        for (const portfolio of portfolios) {
            const item = await this.correctionItemService.createCorrectionItem(
                portfolio,
                correction
            );
            items.push(item);
        }

        return items.map((item) => CorrectionItemResDTO.from(item));
    }
}
