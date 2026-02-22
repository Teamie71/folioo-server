import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { InsightCategory } from '../enums/insight-category.enum';
import { User } from '../../../user/domain/user.entity';

export const MAX_INSIGHTS_PER_USER = 100;

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

    @Column({ type: 'vector', length: 1536, nullable: true, select: false })
    embedding: number[];

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    static create(
        title: string,
        category: InsightCategory,
        description: string,
        embedding: number[],
        userId: number
    ): Insight {
        const insight = new Insight();
        insight.title = title;
        insight.category = category;
        insight.description = description;
        insight.embedding = embedding;
        insight.user = { id: userId } as User;
        return insight;
    }
}
