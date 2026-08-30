import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { CorrectionMaterialRepository } from '../../infrastructure/repositories/correction-material.repository';
import {
    CorrectionMaterial,
    CorrectionMaterialInput,
} from '../../domain/correction-material.entity';

@Injectable()
export class CorrectionMaterialService {
    constructor(private readonly correctionMaterialRepository: CorrectionMaterialRepository) {}

    async findByIdAndUserIdOrThrow(id: number, userId: number): Promise<CorrectionMaterial> {
        const material = await this.correctionMaterialRepository.findByIdAndUserId(id, userId);
        if (!material) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return material;
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionMaterial[]> {
        return this.correctionMaterialRepository.findByCorrectionId(correctionId);
    }

    countByCorrectionId(correctionId: number): Promise<number> {
        return this.correctionMaterialRepository.countByCorrectionId(correctionId);
    }

    async createEmptyMaterial(correctionId: number): Promise<CorrectionMaterial> {
        const material = CorrectionMaterial.create(correctionId, {});
        return this.correctionMaterialRepository.save(material);
    }

    async createMaterials(
        correctionId: number,
        inputList: CorrectionMaterialInput[]
    ): Promise<CorrectionMaterial[]> {
        const materials = inputList.map((input) => CorrectionMaterial.create(correctionId, input));
        return this.correctionMaterialRepository.saveAll(materials);
    }

    // PDF 재추출 시 기존 재료를 전부 새 결과로 교체한다 (활성/비활성 개념 없이 통째 교체).
    async replaceMaterialsForCorrection(
        correctionId: number,
        inputList: CorrectionMaterialInput[]
    ): Promise<CorrectionMaterial[]> {
        await this.correctionMaterialRepository.deleteByCorrectionId(correctionId);
        return this.createMaterials(correctionId, inputList);
    }

    async updateMaterial(
        id: number,
        userId: number,
        input: CorrectionMaterialInput
    ): Promise<CorrectionMaterial> {
        const material = await this.findByIdAndUserIdOrThrow(id, userId);
        material.update(input);
        return this.correctionMaterialRepository.save(material);
    }

    async deleteMaterial(id: number, userId: number): Promise<void> {
        await this.findByIdAndUserIdOrThrow(id, userId);
        await this.correctionMaterialRepository.deleteById(id);
    }

    async deleteByCorrectionId(correctionId: number): Promise<void> {
        await this.correctionMaterialRepository.deleteByCorrectionId(correctionId);
    }
}
