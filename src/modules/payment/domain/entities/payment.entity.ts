import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PayType } from '../enums/pay-type.enum';
import { User } from '../../../user/domain/user.entity';
import { TicketProduct } from '../../../ticket/domain/entities/ticket-product.entity';

@Entity('payment')
@Index(['userId'])
@Index(['ticketProductId'])
export class Payment extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => TicketProduct, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'ticket_product_id' })
    ticketProduct: TicketProduct;

    @Column({ name: 'ticket_product_id' })
    ticketProductId: number;

    @Column({ unique: true })
    mulNo: number;

    @Column({ length: 255, nullable: true })
    payUrl: string;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.REQUESTED,
    })
    status: PaymentStatus;

    @Column({
        type: 'enum',
        enum: PayType,
        nullable: true,
    })
    payType: PayType;

    @Column()
    amount: number;

    @Column({ length: 63, nullable: true })
    cardName: string;

    @Column({ length: 63, nullable: true })
    payAuthCode: string;

    @Column({ length: 31, nullable: true })
    cardQuota: string;

    @Column({ nullable: true })
    paidAt: Date;

    @Column({ nullable: true })
    cancelledAt: Date;

    @Column({ length: 127, nullable: true })
    var1: string;

    @Column({ length: 127, nullable: true })
    var2: string;
}
