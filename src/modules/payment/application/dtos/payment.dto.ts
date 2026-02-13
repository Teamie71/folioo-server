import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { Payment } from '../../domain/entities/payment.entity';

export class CreatePaymentReqDTO {
    @IsInt()
    @IsPositive()
    ticketProductId: number;
}

export class PaymentResDTO {
    id: number;
    ticketProductId: number;
    @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.REQUESTED })
    status: PaymentStatus;
    amount: number;
    payUrl: string | null;
    createdAt: string;

    static from(payment: Payment): PaymentResDTO {
        const dto = new PaymentResDTO();
        dto.id = payment.id;
        dto.ticketProductId = payment.ticketProductId;
        dto.status = payment.status;
        dto.amount = payment.amount;
        dto.payUrl = payment.payUrl ?? null;
        dto.createdAt = payment.createdAt.toISOString();
        return dto;
    }
}
