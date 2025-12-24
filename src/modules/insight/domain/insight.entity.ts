import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { InsightCategory } from './enums/insight-category.enum';
import { User } from 'src/modules/user/domain/user.entity';

@Entity()
export class Insight extends BaseEntity {
    @Column({ length: 20 })
    title: string;

    @Column({ length: 20 })
    activityName: string;

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
}
