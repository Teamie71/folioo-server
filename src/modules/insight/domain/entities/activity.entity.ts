import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, ManyToOne, Unique, JoinColumn } from 'typeorm';

export const MAX_ACTIVITY_TAG_PER_USER = 10;

@Entity()
@Unique(['name', 'user'])
export class Activity extends BaseEntity {
    @Column({ length: 20 })
    name: string;

    @Column()
    userId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    static create(name: string, userId: number): Activity {
        const activity = new Activity();
        activity.name = name.trim();
        activity.userId = userId;
        return activity;
    }
}
