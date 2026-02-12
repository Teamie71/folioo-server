import { Injectable } from '@nestjs/common';
import { TicketProductRepository } from '../../infrastructure/repositories/ticket-product.repository';
import { TicketProduct } from '../../domain/entities/ticket-product.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { TicketProductResDTO } from '../dtos/ticket-product.dto';

@Injectable()
export class TicketProductService {
    constructor(private readonly ticketProductRepository: TicketProductRepository) {}

    async findByIdOrThrow(id: number): Promise<TicketProduct> {
        const ticketProduct = await this.ticketProductRepository.findById(id);
        if (!ticketProduct) {
            throw new BusinessException(ErrorCode.TICKET_PRODUCT_NOT_FOUND);
        }
        return ticketProduct;
    }

    async findActiveProducts(): Promise<TicketProductResDTO[]> {
        const products = await this.ticketProductRepository.findActiveOrderByDisplayOrder();
        return products.map((product) => TicketProductResDTO.from(product));
    }
}
