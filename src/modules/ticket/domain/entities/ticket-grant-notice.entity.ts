import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TicketGrant } from './ticket-grant.entity';
import { TicketGrantNoticeStatus } from '../enums/ticket-grant-notice-status.enum';

export interface TicketGrantNoticePayload {
    displayReason?: string;
    rewards?: Array<{
        type: string;
        quantity: number;
    }>;
    [key: string]: unknown;
}

@Entity('ticket_grant_notice')
@Index(['ticketGrantId'])
@Index(['userId', 'status'])
export class TicketGrantNotice extends BaseEntity {
    @ManyToOne(() => TicketGrant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticket_grant_id' })
    ticketGrant: TicketGrant;

    @Column({ name: 'ticket_grant_id', type: 'int' })
    ticketGrantId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', type: 'int' })
    userId: number;

    @Column({
        type: 'enum',
        enum: TicketGrantNoticeStatus,
        enumName: 'ticket_grant_notice_status_enum',
        default: TicketGrantNoticeStatus.PENDING,
    })
    status: TicketGrantNoticeStatus;

    @Column({ type: 'varchar', length: 100 })
    title: string;

    @Column({ type: 'text' })
    body: string;

    @Column({ name: 'cta_text', type: 'varchar', length: 50, nullable: true })
    ctaText: string | null;

    @Column({ name: 'cta_link', type: 'varchar', length: 255, nullable: true })
    ctaLink: string | null;

    @Column({ type: 'jsonb', nullable: true })
    payload: TicketGrantNoticePayload | null;

    @Column({ name: 'shown_at', type: 'timestamp', nullable: true })
    shownAt: Date | null;

    @Column({ name: 'dismissed_at', type: 'timestamp', nullable: true })
    dismissedAt: Date | null;

    @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
    expiresAt: Date | null;
}
