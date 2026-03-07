import { Injectable } from '@nestjs/common';
import { TicketBalanceResDTO } from 'src/modules/ticket/application/dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from 'src/modules/ticket/application/dtos/ticket-expiring.dto';
import { TicketHistoryResDTO } from 'src/modules/ticket/application/dtos/ticket-history.dto';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';

@Injectable()
export class UserTicketFacade {
    constructor(private readonly ticketService: TicketService) {}

    getBalance(userId: number): Promise<TicketBalanceResDTO> {
        return this.ticketService.getBalance(userId);
    }

    getExpiring(userId: number, days: number): Promise<TicketExpiringResDTO> {
        return this.ticketService.getExpiring(userId, days);
    }

    getHistory(userId: number): Promise<TicketHistoryResDTO> {
        return this.ticketService.getUserTicketHistory(userId);
    }
}
