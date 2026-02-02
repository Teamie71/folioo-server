import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from '../../infrastructure/repositories/correction-item.repository';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionItem } from '../../domain/correction-item.entity';

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
}
