import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { JobCategory } from './enums/job-category.enum';
import { User } from '../../user/domain/user.entity';

@Entity()
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
