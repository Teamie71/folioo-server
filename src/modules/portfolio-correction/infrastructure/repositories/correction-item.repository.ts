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

    saveAll(correctionItems: CorrectionItem[]): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.save(correctionItems);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            relations: ['correctionMaterial'],
            order: { createdAt: 'ASC' },
        });
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.count({
            where: { portfolioCorrection: { id: correctionId } },
        });
    }

    async deleteByCorrectionId(correctionId: number): Promise<number> {
        const result = await this.correctionItemRepository.delete({
            portfolioCorrection: { id: correctionId },
        });
        return result.affected ?? 0;
    }

    async deleteByMaterialId(materialId: number): Promise<number> {
        const result = await this.correctionItemRepository.delete({
            correctionMaterial: { id: materialId },
        });
        return result.affected ?? 0;
    }
}
