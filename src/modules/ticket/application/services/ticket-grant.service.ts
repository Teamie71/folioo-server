import { Injectable } from '@nestjs/common';
import { TicketGrant } from '../../domain/entities/ticket-grant.entity';
import { TicketGrantRepository } from '../../infrastructure/repositories/ticket-grant.repository';

@Injectable()
export class TicketGrantService {
    constructor(private readonly ticketGrantRepository: TicketGrantRepository) {}

    async save(grant: TicketGrant): Promise<TicketGrant> {
        return this.ticketGrantRepository.save(grant);
    }

    async getAdminGrantList() {
        return this.ticketGrantRepository.findAllWithLatestNotice();
    }
}
