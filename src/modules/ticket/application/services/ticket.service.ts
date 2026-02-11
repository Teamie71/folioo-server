import { Injectable } from '@nestjs/common';
import { TicketRepository } from '../../infrastructure/repositories/ticket.repository';
import { Ticket } from '../../domain/entities/ticket.entity';
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
}
