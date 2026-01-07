import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { InsightCategory } from './enums/insight-category.enum';
import { User } from '../../user/domain/user.entity';
import { Activity } from './activity.entity';

@Entity()
export class Insight extends BaseEntity {
    @Column({ length: 20 })
    title: string;

    @Column({
        type: 'enum',
        enum: InsightCategory,
        default: InsightCategory.ETC,
    })
    category: InsightCategory;

    @Column({ length: 250 })
    description: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Activity)
    activity: Activity;
}
