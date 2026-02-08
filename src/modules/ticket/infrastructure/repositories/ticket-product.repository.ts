import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketProduct } from '../../domain/entities/ticket-product.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

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

    async findByIdOrThrow(id: number): Promise<TicketProduct> {
        const entity = await this.findById(id);
        if (!entity) {
            throw new BusinessException(ErrorCode.TICKET_PRODUCT_NOT_FOUND);
        }
        return entity;
    }

    async existsById(id: number): Promise<boolean> {
        return this.ticketProductRepository.exists({ where: { id } });
    }
}
