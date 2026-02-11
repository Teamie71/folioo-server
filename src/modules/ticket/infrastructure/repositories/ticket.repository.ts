import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../domain/entities/ticket.entity';

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

    async existsById(id: number): Promise<boolean> {
        return this.ticketRepository.exists({ where: { id } });
    }
}
