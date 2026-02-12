import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketProduct } from '../../domain/entities/ticket-product.entity';

@Injectable()
export class TicketProductRepository {
    constructor(
        @InjectRepository(TicketProduct)
        private readonly ticketProductRepository: Repository<TicketProduct>
    ) {}

    async save(entity: TicketProduct): Promise<TicketProduct> {
        return this.ticketProductRepository.save(entity);
    }

    async findById(id: number): Promise<TicketProduct | null> {
        return this.ticketProductRepository.findOne({ where: { id } });
    }

    async existsById(id: number): Promise<boolean> {
        return this.ticketProductRepository.exists({ where: { id } });
    }

    async findActiveOrderByDisplayOrder(): Promise<TicketProduct[]> {
        return this.ticketProductRepository.find({
            where: { isActive: true },
            order: { displayOrder: 'ASC' },
        });
    }
}
