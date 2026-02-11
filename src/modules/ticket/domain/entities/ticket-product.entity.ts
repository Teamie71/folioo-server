import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { TicketType } from '../enums/ticket-type.enum';

@Entity('ticket_product')
export class TicketProduct extends BaseEntity {
    @Column({
        type: 'enum',
        enum: TicketType,
    })
    type: TicketType;

    @Column()
    quantity: number;

    @Column()
    price: number;

    @Column({ nullable: true })
    originalPrice: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    displayOrder: number;
}
