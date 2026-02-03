import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { SourceType } from './enums/source-type.enum';
import { User } from '../../user/domain/user.entity';
import { Experience } from '../../experience/domain/experience.entity';

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
        enum: SourceType,
        default: SourceType.INTERNAL,
    })
    sourceType: SourceType;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @OneToOne(() => Experience, { nullable: true })
    @JoinColumn()
    experience: Experience;

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
}
