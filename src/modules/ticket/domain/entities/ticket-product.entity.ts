import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { TicketType } from '../enums/ticket-type.enum';

const TICKET_TYPE_DISPLAY_NAME: Record<TicketType, string> = {
    [TicketType.EXPERIENCE]: '경험 정리 이용권',
    [TicketType.PORTFOLIO_CORRECTION]: '포트폴리오 첨삭 이용권',
};

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

    @Column({ type: 'int', nullable: true })
    originalPrice: number | null;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    displayOrder: number;

    getDisplayName(): string {
        return `${TICKET_TYPE_DISPLAY_NAME[this.type]} ${this.quantity}장`;
    }
}
