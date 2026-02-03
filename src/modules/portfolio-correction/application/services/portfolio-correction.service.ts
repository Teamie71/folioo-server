import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from '../../infrastructure/repositories/correction-item.repository';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';

@Injectable()
export class PortfolioCorrectionService {
    constructor(
        private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository,
        private readonly correctionItemRepository: CorrectionItemRepository
    ) {}

    async findByIdOrThrow(correctionId: number): Promise<PortfolioCorrection> {
        return this.portfolioCorrectionRepository.findByIdOrThrow(correctionId);
    }

    saveCorrectionItem(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }

    async createCorrectionItem(
        portfolio: Portfolio,
        correction: PortfolioCorrection
    ): Promise<CorrectionItem> {
        const item = CorrectionItem.create(portfolio, correction);
        return this.correctionItemRepository.save(item);
    }

    async findPortfolioIdsByCorrectionId(correctionId: number): Promise<number[]> {
        return this.correctionItemRepository.findPortfolioIdsByCorrectionId(correctionId);
    }

    countItemsByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.countByCorrectionId(correctionId);
    }
}
