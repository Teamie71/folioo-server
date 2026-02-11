import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../../user/domain/user.entity';
import { Event } from './event.entity';

@Entity('event_participation')
@Index(['userId'])
@Index(['eventId'])
export class EventParticipation extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => Event, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @Column({ name: 'event_id' })
    eventId: number;

    @Column({ default: 0 })
    progress: number;

    @Column({ default: false })
    isCompleted: boolean;

    @Column({ nullable: true })
    completedAt: Date;

    @Column({ nullable: true })
    rewardGrantedAt: Date;
}
