import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';

@Injectable()
export class TicketRepository {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>
    ) {}

    async save(entity: Ticket): Promise<Ticket> {
        return this.ticketRepository.save(entity);
    }

    async saveAll(entities: Ticket[]): Promise<Ticket[]> {
        return this.ticketRepository.save(entities);
    }

    async findById(id: number): Promise<Ticket | null> {
        return this.ticketRepository.findOne({ where: { id } });
    }

    async existsById(id: number): Promise<boolean> {
        return this.ticketRepository.exists({ where: { id } });
    }

    async countUsedByPaymentId(paymentId: number): Promise<number> {
        return this.ticketRepository.count({
            where: {
                paymentId,
                status: TicketStatus.USED,
            },
        });
    }

    async expireAvailableByPaymentId(paymentId: number, expiredAt: Date): Promise<void> {
        await this.ticketRepository.update(
            {
                paymentId,
                status: TicketStatus.AVAILABLE,
            },
            {
                status: TicketStatus.EXPIRED,
                expiredAt,
            }
        );
    }
}
