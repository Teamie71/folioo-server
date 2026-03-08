import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TicketSource } from '../enums/ticket-source.enum';
import { User } from '../../../user/domain/user.entity';
import { Payment } from '../../../payment/domain/entities/payment.entity';
import { EventParticipation } from '../../../event/domain/entities/event-participation.entity';
import { TicketGrant } from './ticket-grant.entity';

@Entity('ticket')
@Index(['userId'])
@Index(['paymentId'])
@Index(['eventParticipationId'])
@Index(['ticketGrantId'])
export class Ticket extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        type: 'enum',
        enum: TicketType,
    })
    type: TicketType;

    @Column({
        type: 'enum',
        enum: TicketStatus,
        default: TicketStatus.AVAILABLE,
    })
    status: TicketStatus;

    @Column({
        type: 'enum',
        enum: TicketSource,
    })
    source: TicketSource;

    @ManyToOne(() => Payment, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'payment_id' })
    payment: Payment;

    @Column({ name: 'payment_id', nullable: true })
    paymentId: number;

    @ManyToOne(() => EventParticipation, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'event_participation_id' })
    eventParticipation: EventParticipation;

    @Column({ name: 'event_participation_id', nullable: true })
    eventParticipationId: number;

    @ManyToOne(() => TicketGrant, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'ticket_grant_id' })
    ticketGrant: TicketGrant | null;

    @Column({ name: 'ticket_grant_id', nullable: true })
    ticketGrantId: number | null;

    @Column({ nullable: true })
    usedAt: Date;

    @Column({ nullable: true })
    expiredAt: Date;
}
