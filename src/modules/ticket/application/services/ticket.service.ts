import { Injectable } from '@nestjs/common';
import { TicketRepository } from '../../infrastructure/repositories/ticket.repository';

@Injectable()
export class TicketService {
    constructor(private readonly ticketRepository: TicketRepository) {}
}
