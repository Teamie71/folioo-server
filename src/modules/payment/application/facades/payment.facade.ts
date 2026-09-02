import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { PaymentService } from '../services/payment.service';
import { PayAppWebhookReqDTO } from '../dtos/payment.dto';
import { PayAppClient } from '../../infrastructure/clients/payapp.client';

@Injectable()
export class PaymentFacade {
    private readonly logger = new Logger(PaymentFacade.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly payAppClient: PayAppClient
    ) {}

    @Transactional()
    async handleWebhook(dto: PayAppWebhookReqDTO): Promise<void> {
        this.payAppClient.verifyWebhook({
            userid: dto.userid,
            linkkey: dto.linkkey,
            linkval: dto.linkval,
        });

        const payment = await this.paymentService.findByMulNoOrThrow(dto.mul_no);

        if (!this.paymentService.isPayAppPaid(dto.pay_state)) {
            this.logger.warn(`Non-success webhook: mulNo=${dto.mul_no}, state=${dto.pay_state}`);
            return;
        }

        await this.paymentService.markPaid(payment, dto);
    }

    @Transactional()
    async cancelPayment(paymentId: number, userId: number): Promise<Payment> {
        const payment = await this.paymentService.findByIdAndUserIdOrThrow(paymentId, userId);

        if (payment.status === PaymentStatus.CANCELLED) {
            return payment;
        }

        const wasPaid = payment.status === PaymentStatus.PAID;

        if (wasPaid) {
            try {
                await this.payAppClient.requestCancel(payment.mulNo, 'user_requested', {
                    paymentId,
                    currentStatus: payment.status,
                });
            } catch (error) {
                this.logger.error(
                    `Cancel payment external call failed: paymentId=${paymentId}, mulNo=${payment.mulNo}, status=${payment.status}, userId=${userId}`
                );
                throw error;
            }
        }

        return this.paymentService.markCancelled(payment);
    }
}
