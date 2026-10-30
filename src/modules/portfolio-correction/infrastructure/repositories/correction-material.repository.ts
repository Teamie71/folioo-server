import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionMaterial } from '../../domain/correction-material.entity';

@Injectable()
export class CorrectionMaterialRepository {
    constructor(
        @InjectRepository(CorrectionMaterial)
        private readonly correctionMaterialRepository: Repository<CorrectionMaterial>
    ) {}

    save(material: CorrectionMaterial): Promise<CorrectionMaterial> {
        return this.correctionMaterialRepository.save(material);
    }

    saveAll(materials: CorrectionMaterial[]): Promise<CorrectionMaterial[]> {
        return this.correctionMaterialRepository.save(materials);
    }

    findById(id: number): Promise<CorrectionMaterial | null> {
        return this.correctionMaterialRepository.findOne({ where: { id } });
    }

    findByIdAndUserId(id: number, userId: number): Promise<CorrectionMaterial | null> {
        return this.correctionMaterialRepository.findOne({
            where: { id, portfolioCorrection: { user: { id: userId } } },
        });
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionMaterial[]> {
        return this.correctionMaterialRepository.find({
            where: { portfolioCorrection: { id: correctionId } },
            order: { createdAt: 'ASC' },
        });
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionMaterialRepository.count({
            where: { portfolioCorrection: { id: correctionId } },
        });
    }

    async deleteById(id: number): Promise<void> {
        await this.correctionMaterialRepository.delete(id);
    }

    async deleteByCorrectionId(correctionId: number): Promise<void> {
        await this.correctionMaterialRepository.delete({
            portfolioCorrection: { id: correctionId },
        });
    }
}
