import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { SourceType } from './enums/source-type.enum';
import { PortfolioStatus } from './enums/portfolio-status.enum';
import { User } from '../../user/domain/user.entity';
import { Experience } from '../../experience/domain/experience.entity';

interface PortfolioContent {
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
}

export const MAX_EXTERNAL_PORTFOLIO_BLOCKS = 5;

@Entity()
export class Portfolio extends BaseEntity {
    @Column({ length: 20 })
    name: string;

    @Column({ length: 400 })
    description: string;

    @Column({ length: 400 })
    responsibilities: string;

    @Column({ length: 400 })
    problemSolving: string;

    @Column({ length: 400 })
    learnings: string;

    @Column({ nullable: true })
    contributionRate: number;

    @Column({
        type: 'enum',
        enum: PortfolioStatus,
        default: PortfolioStatus.NOT_STARTED,
    })
    status: PortfolioStatus;

    @Column({
        type: 'enum',
        enum: SourceType,
        default: SourceType.INTERNAL,
    })
    sourceType: SourceType;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Experience, { nullable: true })
    @JoinColumn()
    experience: Experience;

    static createInternal(userId: number, experienceId: number): Portfolio {
        const portfolio = new Portfolio();
        portfolio.name = '';
        portfolio.description = '';
        portfolio.responsibilities = '';
        portfolio.problemSolving = '';
        portfolio.learnings = '';
        portfolio.sourceType = SourceType.INTERNAL;
        portfolio.user = { id: userId } as User;
        portfolio.experience = { id: experienceId } as Experience;
        return portfolio;
    }

    static createExternal(userId: number): Portfolio {
        const portfolio = new Portfolio();
        portfolio.name = '';
        portfolio.description = '';
        portfolio.responsibilities = '';
        portfolio.problemSolving = '';
        portfolio.learnings = '';
        portfolio.sourceType = SourceType.EXTERNAL;
        portfolio.user = { id: userId } as User;
        return portfolio;
    }

    update(updates: { name?: string; contributionRate?: number }): void {
        if (updates.name !== undefined) {
            this.name = updates.name;
        }
        if (updates.contributionRate !== undefined) {
            this.contributionRate = updates.contributionRate;
        }
    }

    complete(content: PortfolioContent): void {
        this.description = content.description;
        this.responsibilities = content.responsibilities;
        this.problemSolving = content.problemSolving;
        this.learnings = content.learnings;
        this.status = PortfolioStatus.COMPLETED;
    }

    fail(): void {
        this.status = PortfolioStatus.FAILED;
    }
}
