import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';

export const MAX_ACTIVITY_TAG_PER_USER = 10;

@Entity()
@Unique(['name', 'user'])
export class Activity extends BaseEntity {
    @Column({ length: 20 })
    name: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    static create(name: string, userId: number): Activity {
        const activity = new Activity();
        activity.name = name.trim();
        activity.user = { id: userId } as User;
        return activity;
    }
}
