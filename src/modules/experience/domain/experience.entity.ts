import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { JobCategory } from './enums/job-category.enum';
import { User } from '../../user/domain/user.entity';

export const MAX_EXPERIENCES_PER_USER = 15;
export const EXPERIENCE_CREDIT_COST = 30;

@Entity()
@Unique(['user', 'name'])
export class Experience extends BaseEntity {
    @Column({ length: 20 })
    name: string;

    @Column({
        type: 'enum',
        enum: JobCategory,
        default: JobCategory.NONE,
    })
    hopeJob: JobCategory;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;
}
