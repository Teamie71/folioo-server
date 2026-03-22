import { Injectable, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { PayType } from '../../domain/enums/pay-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PayAppWebhookReqDTO } from '../dtos/payment.dto';

const PG_UNIQUE_VIOLATION = '23505';
const MAX_MUL_NO_RETRY = 5;
const PAYAPP_PAY_STATE_PAID = '4';

const PAY_TYPE_MAP: Record<string, PayType> = {
    '1': PayType.CARD,
    '2': PayType.PHONE,
    '6': PayType.BANK_TRANSFER,
    '7': PayType.VIRTUAL_ACCOUNT,
};

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

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

    async findByMulNoOrThrow(mulNo: number): Promise<Payment> {
        const payment = await this.paymentRepository.findByMulNo(mulNo);
        if (!payment) {
            throw new BusinessException(ErrorCode.PAYMENT_NOT_FOUND);
        }
        return payment;
    }

    async markPaid(
        payment: Payment,
        dto: PayAppWebhookReqDTO
    ): Promise<{ payment: Payment; newlyPaid: boolean }> {
        const receivedAmount = dto.amount ?? dto.price;
        if (receivedAmount !== undefined && receivedAmount !== payment.amount) {
            throw new BusinessException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }

        if (payment.status === PaymentStatus.PAID) {
            this.logger.warn(`Idempotent webhook hit: mulNo=${payment.mulNo}`);
            return { payment, newlyPaid: false };
        }

        if (payment.status !== PaymentStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        const paidAt = new Date();
        const update: Partial<Payment> = {
            status: PaymentStatus.PAID,
            paidAt,
        };

        if (dto.pay_type && PAY_TYPE_MAP[dto.pay_type]) {
            update.payType = PAY_TYPE_MAP[dto.pay_type];
        }
        if (dto.card_name) {
            update.cardName = dto.card_name;
        }
        if (dto.pay_auth_code) {
            update.payAuthCode = dto.pay_auth_code;
        }
        if (dto.card_quota) {
            update.cardQuota = dto.card_quota;
        }
        if (dto.var1) {
            update.var1 = dto.var1;
        }
        if (dto.var2) {
            update.var2 = dto.var2;
        }

        const { updated } = await this.paymentRepository.updatePaidIfRequested(payment.id, update);
        if (!updated) {
            const refreshed = await this.findByIdOrThrow(payment.id);
            if (refreshed.status === PaymentStatus.PAID) {
                return { payment: refreshed, newlyPaid: false };
            }
            throw new BusinessException(ErrorCode.PAYMENT_ALREADY_PAID);
        }

        const refreshed = await this.findByIdOrThrow(payment.id);
        return { payment: refreshed, newlyPaid: true };
    }

    isPayAppPaid(payState: string): boolean {
        return payState === PAYAPP_PAY_STATE_PAID;
    }

    async savePayResult(payment: Payment, payUrl: string, mulNo: number): Promise<Payment> {
        payment.payUrl = payUrl;
        if (mulNo > 0) {
            payment.mulNo = mulNo;
        }
        return this.paymentRepository.save(payment);
    }

    async markCancelled(payment: Payment): Promise<Payment> {
        if (payment.status === PaymentStatus.CANCELLED) {
            return payment;
        }

        if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.REQUESTED) {
            throw new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        }

        payment.status = PaymentStatus.CANCELLED;
        payment.cancelledAt = new Date();

        return this.paymentRepository.save(payment);
    }
}
