import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { SourceType } from './enums/source-type.enum';
import { User } from '../../user/domain/user.entity';
import { Experience } from '../../experience/domain/experience.entity';

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
}
