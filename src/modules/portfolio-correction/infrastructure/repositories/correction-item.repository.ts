import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionItem } from '../../domain/correction-item.entity';

@Injectable()
export class CorrectionItemRepository {
    constructor(
        @InjectRepository(CorrectionItem)
        private readonly correctionItemRepository: Repository<CorrectionItem>
    ) {}

    save(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }

    async findPortfolioIdsByCorrectionId(correctionId: number): Promise<number[]> {
        const results = await this.correctionItemRepository
            .createQueryBuilder('ci')
            .select('ci.portfolioId', 'portfolioId')
            .where('ci.portfolioCorrectionId = :correctionId', { correctionId })
            .getRawMany<{ portfolioId: number }>();
        return results.map((r) => r.portfolioId);
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.count({
            where: { portfolioCorrection: { id: correctionId } },
        });
    }
}
