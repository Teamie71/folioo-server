import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../domain/entities/ticket.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class TicketRepository {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>
    ) {}

    async save(entity: Ticket): Promise<Ticket> {
        return this.ticketRepository.save(entity);
    }

    async findById(id: number): Promise<Ticket | null> {
        return this.ticketRepository.findOne({ where: { id } });
    }

    async findByIdOrThrow(id: number): Promise<Ticket> {
        const entity = await this.findById(id);
        if (!entity) {
            throw new BusinessException(ErrorCode.TICKET_NOT_FOUND);
        }
        return entity;
    }

    async existsById(id: number): Promise<boolean> {
        return this.ticketRepository.exists({ where: { id } });
    }
}
