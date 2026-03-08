import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketGrantActorType } from '../enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from '../enums/ticket-grant-source-type.enum';

export interface TicketGrantRewardSnapshotItem {
    type: TicketType;
    quantity: number;
}

@Entity('ticket_grant')
@Index(['userId'])
@Index(['sourceType', 'sourceRefId'])
@Index(['actorType', 'actorId'])
export class TicketGrant extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        name: 'source_type',
        type: 'enum',
        enum: TicketGrantSourceType,
        enumName: 'ticket_grant_source_type_enum',
    })
    sourceType: TicketGrantSourceType;

    @Column({ name: 'source_ref_id', type: 'int', nullable: true })
    sourceRefId: number | null;

    @Column({
        name: 'actor_type',
        type: 'enum',
        enum: TicketGrantActorType,
        enumName: 'ticket_grant_actor_type_enum',
    })
    actorType: TicketGrantActorType;

    @Column({ name: 'actor_id', type: 'varchar', length: 64, nullable: true })
    actorId: string | null;

    @Column({ name: 'reason_code', type: 'varchar', length: 64, nullable: true })
    reasonCode: string | null;

    @Column({ name: 'reason_text', type: 'varchar', length: 500, nullable: true })
    reasonText: string | null;

    @Column({ name: 'reward_snapshot', type: 'jsonb' })
    rewardSnapshot: TicketGrantRewardSnapshotItem[];

    @Column({ name: 'granted_at', type: 'timestamp' })
    grantedAt: Date;
}
