import { Injectable } from '@nestjs/common';
import { CorrectionItemRepository } from '../../infrastructure/repositories/correction-item.repository';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { CorrectionMaterial } from '../../domain/correction-material.entity';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';

@Injectable()
export class CorrectionItemService {
    constructor(private readonly correctionItemRepository: CorrectionItemRepository) {}

    saveCorrectionItem(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }

    saveAll(correctionItems: CorrectionItem[]): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.saveAll(correctionItems);
    }

    async createCorrectionItem(
        material: CorrectionMaterial,
        correction: PortfolioCorrection
    ): Promise<CorrectionItem> {
        const item = CorrectionItem.create(material, correction);
        return this.correctionItemRepository.save(item);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionItem[]> {
        return this.correctionItemRepository.findByCorrectionId(correctionId);
    }

    countItemsByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionItemRepository.countByCorrectionId(correctionId);
    }

    async deleteByCorrectionId(correctionId: number): Promise<void> {
        await this.correctionItemRepository.deleteByCorrectionId(correctionId);
    }

    async deleteByMaterialId(materialId: number): Promise<void> {
        await this.correctionItemRepository.deleteByMaterialId(materialId);
    }
}
