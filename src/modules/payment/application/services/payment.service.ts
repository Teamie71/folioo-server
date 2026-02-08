import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';

@Injectable()
export class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository) {}
}
