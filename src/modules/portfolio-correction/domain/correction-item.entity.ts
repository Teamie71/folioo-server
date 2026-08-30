import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';
import { CorrectionMaterial } from './correction-material.entity';

@Entity()
export class CorrectionItem extends BaseEntity {
    @Column({
        type: 'jsonb',
        nullable: true,
    })
    description: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    responsibilities: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    problemSolving: Record<string, unknown>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    learnings: Record<string, unknown>;

    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    // 실제 DB 제약은 CASCADE (correction_material_id FK). 내부 재료가 지워지면 결과도 함께 지운다.
    @ManyToOne(() => CorrectionMaterial, { onDelete: 'CASCADE' })
    correctionMaterial: CorrectionMaterial;

    static create(
        correctionMaterial: CorrectionMaterial,
        portfolioCorrection: PortfolioCorrection
    ): CorrectionItem {
        const item = new CorrectionItem();
        item.correctionMaterial = correctionMaterial;
        item.portfolioCorrection = portfolioCorrection;
        return item;
    }
}
