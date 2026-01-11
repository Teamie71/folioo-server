import { BaseEntity } from 'src/common/entities/base.entity';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { PortfolioCorrection } from './portfolio-correction.entity';

@Entity()
export class CorrectionItem extends BaseEntity {
    @Column({
        type: 'jsonb',
        nullable: true,
    })
    description: Record<string, any>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    responsibilities: Record<string, any>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    problemSolving: Record<string, any>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    learnings: Record<string, any>;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    overallReview: Record<string, any>;

    @ManyToOne(() => PortfolioCorrection, { onDelete: 'CASCADE' })
    portfolioCorrection: PortfolioCorrection;

    @ManyToOne(() => Portfolio, { onDelete: 'CASCADE' })
    portfolio: Portfolio;
}
