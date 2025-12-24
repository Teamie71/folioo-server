import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { CorrectionStatus } from './enums/correction-status.enum';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';

@Entity()
export class PortfolioCorrection extends BaseEntity {
    @Column({ length: 20 })
    title: string;

    @Column({ length: 20 })
    companyName: string;

    @Column({ length: 20 })
    positionName: string;

    @Column({ length: 700 })
    jobDescription: string;

    @Column({ length: 1500, nullable: true })
    companyInsight: string;

    @Column({ length: 200, nullable: true })
    highlightPoint: string;

    @Column({
        type: 'enum',
        enum: CorrectionStatus,
        default: CorrectionStatus.NOT_STARTED,
    })
    status: CorrectionStatus;

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

    @ManyToOne(() => Portfolio, { onDelete: 'CASCADE' })
    portfolio: Portfolio;
}
