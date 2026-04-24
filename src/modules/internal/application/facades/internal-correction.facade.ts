import { Injectable } from '@nestjs/common';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import {
    InternalCorrectionPayload,
    PortfolioCorrectionService,
} from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';

@Injectable()
export class InternalCorrectionFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly portfolioService: PortfolioService
    ) {}

    async getInternalCorrectionDetail(correctionId: number): Promise<InternalCorrectionPayload> {
        const payload =
            await this.portfolioCorrectionService.getInternalCorrectionDetail(correctionId);
        const candidateIds = [
            ...new Set([
                ...payload.portfolioIds,
                ...payload.items.map((item) => item.portfolio.id),
            ]),
        ];

        if (candidateIds.length === 0) {
            return payload;
        }

        const portfolios = await this.portfolioService.findByIds(candidateIds);
        const internalPortfolioIds = new Set(
            portfolios
                .filter((portfolio) => portfolio.sourceType === SourceType.INTERNAL)
                .map((portfolio) => portfolio.id)
        );

        return {
            correction: payload.correction,
            portfolioIds: payload.portfolioIds.filter((portfolioId) =>
                internalPortfolioIds.has(portfolioId)
            ),
            items: payload.items.filter((item) => internalPortfolioIds.has(item.portfolio.id)),
        };
    }
}
