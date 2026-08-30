import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';

export const MAX_CORRECTION_MATERIALS = 5;
export const CORRECTION_MATERIAL_NAME_MAX_LENGTH = 20;
export const CORRECTION_MATERIAL_FIELD_MAX_LENGTH = 1000;

export interface CorrectionMaterialInput {
    name?: string;
    description?: string;
    responsibilities?: string;
    problemSolving?: string;
    learnings?: string;
}

@Entity('correction_material')
export class CorrectionMaterial extends BaseEntity {
    @Column({ length: CORRECTION_MATERIAL_NAME_MAX_LENGTH, default: '' })
    name: string;

    @Column({ length: CORRECTION_MATERIAL_FIELD_MAX_LENGTH, default: '' })
    description: string;

    @Column({ length: CORRECTION_MATERIAL_FIELD_MAX_LENGTH, default: '' })
    responsibilities: string;

    @Column({ length: CORRECTION_MATERIAL_FIELD_MAX_LENGTH, default: '' })
    problemSolving: string;

    @Column({ length: CORRECTION_MATERIAL_FIELD_MAX_LENGTH, default: '' })
    learnings: string;

    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    static create(
        portfolioCorrectionId: number,
        input: CorrectionMaterialInput
    ): CorrectionMaterial {
        const material = new CorrectionMaterial();
        material.portfolioCorrection = { id: portfolioCorrectionId } as PortfolioCorrection;
        material.name = input.name ?? '';
        material.description = input.description ?? '';
        material.responsibilities = input.responsibilities ?? '';
        material.problemSolving = input.problemSolving ?? '';
        material.learnings = input.learnings ?? '';
        return material;
    }

    update(input: CorrectionMaterialInput): void {
        if (input.name !== undefined) this.name = input.name;
        if (input.description !== undefined) this.description = input.description;
        if (input.responsibilities !== undefined) this.responsibilities = input.responsibilities;
        if (input.problemSolving !== undefined) this.problemSolving = input.problemSolving;
        if (input.learnings !== undefined) this.learnings = input.learnings;
    }
}
