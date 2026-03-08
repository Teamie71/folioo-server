import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { PaymentService } from '../services/payment.service';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketProductService } from 'src/modules/ticket/application/services/ticket-product.service';
import { TicketGrantActorType } from 'src/modules/ticket/domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from 'src/modules/ticket/domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { PayAppWebhookReqDTO } from '../dtos/payment.dto';
import { PayAppClient } from '../../infrastructure/clients/payapp.client';

@Injectable()
export class PaymentFacade {
    private readonly logger = new Logger(PaymentFacade.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly ticketProductService: TicketProductService,
        private readonly ticketGrantFacade: TicketGrantFacade,
        private readonly ticketService: TicketService,
        private readonly payAppClient: PayAppClient
    ) {}

    async createPayment(userId: number, ticketProductId: number): Promise<Payment> {
        const ticketProduct = await this.ticketProductService.findByIdOrThrow(ticketProductId);
        return this.paymentService.createPayment(userId, ticketProduct.id, ticketProduct.price);
    }

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

        const { payment: updatedPayment, newlyPaid } = await this.paymentService.markPaid(
            payment,
            dto
        );

        if (newlyPaid && updatedPayment.status === PaymentStatus.PAID && updatedPayment.paidAt) {
            const ticketProduct = await this.ticketProductService.findByIdOrThrow(
                updatedPayment.ticketProductId
            );

            await this.ticketGrantFacade.issueGrantAndTickets({
                userId: updatedPayment.userId,
                rewards: [{ type: ticketProduct.type, quantity: ticketProduct.quantity }],
                grantSourceType: TicketGrantSourceType.PURCHASE,
                issueContext: {
                    source: TicketSource.PURCHASE,
                    paymentId: updatedPayment.id,
                },
                actorType: TicketGrantActorType.SYSTEM,
                actorId: 'payapp-webhook',
                sourceRefId: updatedPayment.id,
                reasonCode: 'payment_purchase',
                reasonText: `payment:${updatedPayment.id}`,
                grantedAt: updatedPayment.paidAt,
            });

            this.logger.log(
                `Tickets issued: paymentId=${updatedPayment.id}, type=${ticketProduct.type}, qty=${ticketProduct.quantity}`
            );
        }
    }

    @Transactional()
    async cancelPayment(paymentId: number, userId: number): Promise<Payment> {
        const payment = await this.paymentService.findByIdAndUserIdOrThrow(paymentId, userId);

        if (payment.status === PaymentStatus.CANCELLED) {
            return payment;
        }

        if (payment.status === PaymentStatus.PAID) {
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

        const cancelledPayment = await this.paymentService.markCancelled(payment);

        if (payment.status === PaymentStatus.PAID) {
            await this.ticketService.revokeAvailableTicketsForPayment(cancelledPayment.id);
        }

        return cancelledPayment;
    }
}
