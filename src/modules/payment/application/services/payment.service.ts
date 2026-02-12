import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async createPayment(userId: number, ticketProductId: number, amount: number): Promise<Payment> {
        const mulNo = await this.generateMulNo();

        const payment = new Payment();
        payment.userId = userId;
        payment.ticketProductId = ticketProductId;
        payment.amount = amount;
        payment.status = PaymentStatus.REQUESTED;
        payment.mulNo = mulNo;

        return this.paymentRepository.save(payment);
    }

    private async generateMulNo(): Promise<number> {
        let mulNo = Date.now();

        while (await this.paymentRepository.existsByMulNo(mulNo)) {
            mulNo += 1;
        }

        return mulNo;
    }

    async findByIdOrThrow(id: number): Promise<Payment> {
        const payment = await this.paymentRepository.findById(id);
        if (!payment) {
            throw new BusinessException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        return payment;
    }

    async findByIdAndUserIdOrThrow(id: number, userId: number): Promise<Payment> {
        const payment = await this.paymentRepository.findByIdAndUserId(id, userId);
        if (!payment) {
            const exists = await this.paymentRepository.existsById(id);
            if (exists) {
                throw new BusinessException(ErrorCode.PAYMENT_NOT_OWNER);
            }
            throw new BusinessException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        return payment;
    }
}
