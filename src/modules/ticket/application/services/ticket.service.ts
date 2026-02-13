import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketSource } from '../../domain/enums/ticket-source.enum';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketRepository } from '../../infrastructure/repositories/ticket.repository';
import { TicketBalanceResDTO } from '../dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from '../dtos/ticket-expiring.dto';

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

    async getBalance(userId: number): Promise<TicketBalanceResDTO> {
        const rows = await this.ticketRepository.countAvailableByUserIdGroupByType(userId);

        const countMap = new Map(rows.map((r) => [r.type, r.count]));

        return TicketBalanceResDTO.from(
            countMap.get(TicketType.EXPERIENCE) ?? 0,
            countMap.get(TicketType.PORTFOLIO_CORRECTION) ?? 0
        );
    }

    async getExpiring(userId: number, days: number): Promise<TicketExpiringResDTO> {
        const now = new Date();
        const expiredBefore = new Date(now);
        expiredBefore.setDate(expiredBefore.getDate() + days);

        const rows = await this.ticketRepository.findExpiringByUserIdGroupByType(
            userId,
            now,
            expiredBefore
        );

        const infoMap = new Map(rows.map((r) => [r.type, r]));

        const experienceInfo = infoMap.get(TicketType.EXPERIENCE);
        const correctionInfo = infoMap.get(TicketType.PORTFOLIO_CORRECTION);

        return TicketExpiringResDTO.from(
            experienceInfo?.count ?? 0,
            experienceInfo?.earliestExpiredAt ? new Date(experienceInfo.earliestExpiredAt) : null,
            correctionInfo?.count ?? 0,
            correctionInfo?.earliestExpiredAt ? new Date(correctionInfo.earliestExpiredAt) : null
        );
    }
}
