import { Injectable } from '@nestjs/common';
import { TicketProductRepository } from '../../infrastructure/repositories/ticket-product.repository';

@Injectable()
export class TicketProductService {
    constructor(private readonly ticketProductRepository: TicketProductRepository) {}
}
