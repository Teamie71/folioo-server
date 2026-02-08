import { Injectable } from '@nestjs/common';
import { CorrectionItemRepository } from '../../infrastructure/repositories/correction-item.repository';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class CorrectionItemService {
    constructor(private readonly correctionItemRepository: CorrectionItemRepository) {}

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

    async findCorrectionIdByPortfolioIdOrThrow(portfolioId: number): Promise<number> {
        const correctionId =
            await this.correctionItemRepository.findCorrectionIdByPortfolioId(portfolioId);
        if (correctionId === null) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return correctionId;
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.findByCorrectionId(correctionId);
    }

    countItemsByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.countByCorrectionId(correctionId);
    }
}
