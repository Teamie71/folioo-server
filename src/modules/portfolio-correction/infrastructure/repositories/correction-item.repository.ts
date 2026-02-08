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

    async findCorrectionIdByPortfolioId(portfolioId: number): Promise<number | null> {
        const result = await this.correctionItemRepository
            .createQueryBuilder('ci')
            .select('ci.portfolioCorrectionId', 'correctionId')
            .where('ci.portfolioId = :portfolioId', { portfolioId })
            .getRawOne<{ correctionId: number }>();

        return result?.correctionId ?? null;
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            relations: ['portfolio'],
            order: { createdAt: 'ASC' },
        });
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.count({
            where: { portfolioCorrection: { id: correctionId } },
        });
    }
}
