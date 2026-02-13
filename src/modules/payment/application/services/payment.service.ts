import { Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const PG_UNIQUE_VIOLATION = '23505';
const MAX_MUL_NO_RETRY = 5;

@Injectable()
export class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository) {}

    async createPayment(userId: number, ticketProductId: number, amount: number): Promise<Payment> {
        for (let attempt = 0; attempt < MAX_MUL_NO_RETRY; attempt += 1) {
            const mulNo = await this.generateMulNo();

            const payment = new Payment();
            payment.userId = userId;
            payment.ticketProductId = ticketProductId;
            payment.amount = amount;
            payment.status = PaymentStatus.REQUESTED;
            payment.mulNo = mulNo;

            try {
                return await this.paymentRepository.save(payment);
            } catch (error) {
                if (
                    error instanceof QueryFailedError &&
                    (error as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
                ) {
                    continue;
                }
                throw error;
            }
        }

        throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    private async generateMulNo(): Promise<number> {
        let mulNo = Math.floor(Date.now() / 1000);

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
