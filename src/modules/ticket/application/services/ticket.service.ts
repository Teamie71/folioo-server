import { Injectable } from '@nestjs/common';
import { TicketRepository } from '../../infrastructure/repositories/ticket.repository';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';
import { TicketSource } from '../../domain/enums/ticket-source.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class TicketService {
    constructor(private readonly ticketRepository: TicketRepository) {}

    async findByIdOrThrow(id: number): Promise<Ticket> {
        const ticket = await this.ticketRepository.findById(id);
        if (!ticket) {
            throw new BusinessException(ErrorCode.TICKET_NOT_FOUND);
        }
        return ticket;
    }

    async issueTicketsForPayment(
        userId: number,
        paymentId: number,
        type: TicketType,
        quantity: number
    ): Promise<Ticket[]> {
        const tickets = Array.from({ length: quantity }).map(() => {
            const ticket = new Ticket();
            ticket.userId = userId;
            ticket.paymentId = paymentId;
            ticket.type = type;
            ticket.status = TicketStatus.AVAILABLE;
            ticket.source = TicketSource.PURCHASE;
            return ticket;
        });

        return this.ticketRepository.saveAll(tickets);
    }

    async revokeAvailableTicketsForPayment(paymentId: number): Promise<void> {
        const usedCount = await this.ticketRepository.countUsedByPaymentId(paymentId);
        if (usedCount > 0) {
            throw new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        }

        await this.ticketRepository.expireAvailableByPaymentId(paymentId, new Date());
    }
}
