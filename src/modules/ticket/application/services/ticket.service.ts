import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketSource } from '../../domain/enums/ticket-source.enum';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketRepository } from '../../infrastructure/repositories/ticket.repository';
import { TicketBalanceResDTO } from '../dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from '../dtos/ticket-expiring.dto';
import { TicketHistoryItemResDTO, TicketHistoryResDTO } from '../dtos/ticket-history.dto';

type TicketRewardItem = {
    type: TicketType;
    quantity: number;
};

type TicketIssueSource =
    | {
          source: TicketSource.PURCHASE;
          paymentId: number;
      }
    | {
          source: TicketSource.EVENT;
          eventParticipationId: number;
      };

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
        return this.issueTickets(
            userId,
            {
                source: TicketSource.PURCHASE,
                paymentId,
            },
            [{ type, quantity }]
        );
    }

    async issueTickets(
        userId: number,
        source: TicketIssueSource,
        rewards: TicketRewardItem[]
    ): Promise<Ticket[]> {
        const tickets = rewards.flatMap((reward) => {
            return Array.from({ length: reward.quantity }).map(() => {
                const ticket = new Ticket();
                ticket.userId = userId;
                ticket.source = source.source;

                if (source.source === TicketSource.PURCHASE) {
                    ticket.paymentId = source.paymentId;
                }

                if (source.source === TicketSource.EVENT) {
                    ticket.eventParticipationId = source.eventParticipationId;
                }

                ticket.type = reward.type;
                ticket.status = TicketStatus.AVAILABLE;
                return ticket;
            });
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

    @Transactional()
    async consumeTicket(userId: number, type: TicketType): Promise<Ticket> {
        const now = new Date();
        const ticket = await this.ticketRepository.findOneAvailableForConsume(userId, type, now);

        if (!ticket) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_TICKETS);
        }

        ticket.status = TicketStatus.USED;
        ticket.usedAt = now;
        return this.ticketRepository.save(ticket);
    }

    async getBalance(userId: number): Promise<TicketBalanceResDTO> {
        const rows = await this.ticketRepository.countAvailableByUserIdGroupByType(userId);

        const countMap = new Map(rows.map((r) => [r.type, r.count]));

        return TicketBalanceResDTO.from(
            countMap.get(TicketType.EXPERIENCE) ?? 0,
            countMap.get(TicketType.PORTFOLIO_CORRECTION) ?? 0
        );
    }

    async getBalanceBatch(): Promise<Map<number, { experience: number; correction: number }>> {
        const rows = await this.ticketRepository.countAvailableGroupedByUserAndType();
        const map = new Map<number, { experience: number; correction: number }>();

        for (const row of rows) {
            if (!map.has(row.userId)) {
                map.set(row.userId, { experience: 0, correction: 0 });
            }
            const entry = map.get(row.userId)!;
            if (row.type === TicketType.EXPERIENCE) {
                entry.experience = row.count;
            } else if (row.type === TicketType.PORTFOLIO_CORRECTION) {
                entry.correction = row.count;
            }
        }

        return map;
    }

    async issueAdminTickets(userId: number, type: TicketType, quantity: number): Promise<Ticket[]> {
        const tickets = Array.from({ length: quantity }).map(() => {
            const ticket = new Ticket();
            ticket.userId = userId;
            ticket.type = type;
            ticket.status = TicketStatus.AVAILABLE;
            ticket.source = TicketSource.EVENT;
            return ticket;
        });

        return this.ticketRepository.saveAll(tickets);
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

    async getUserTicketHistory(userId: number): Promise<TicketHistoryResDTO> {
        const tickets = await this.ticketRepository.findByUserId(userId);

        const history: TicketHistoryItemResDTO[] = tickets.map((t) => {
            const item = new TicketHistoryItemResDTO();
            item.ticketId = t.id;
            item.type = t.type;
            item.status = t.status;
            item.source = t.source;
            item.createdAt = t.createdAt.toISOString();
            item.usedAt = t.usedAt ? t.usedAt.toISOString() : null;
            item.expiredAt = t.expiredAt ? t.expiredAt.toISOString() : null;
            return item;
        });

        return TicketHistoryResDTO.from(history);
    }

    async getTicketHistory() {
        return this.ticketRepository.findAllWithUserInfo();
    }
}
