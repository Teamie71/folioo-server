import { Injectable } from '@nestjs/common';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentService } from '../services/payment.service';
import { TicketProductService } from 'src/modules/ticket/application/services/ticket-product.service';

@Injectable()
export class PaymentFacade {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly ticketProductService: TicketProductService
    ) {}

    async createPayment(userId: number, ticketProductId: number): Promise<Payment> {
        const ticketProduct = await this.ticketProductService.findByIdOrThrow(ticketProductId);
        return this.paymentService.createPayment(userId, ticketProduct.id, ticketProduct.price);
    }
}
