import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { Payment } from '../../domain/entities/payment.entity';

export class CreatePaymentReqDTO {
    @IsInt()
    @IsPositive()
    ticketProductId: number;
}

export class PayAppWebhookReqDTO {
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    mul_no: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    amount?: number;

    @IsString()
    @IsNotEmpty()
    pay_state: string;

    @IsOptional()
    @IsString()
    pay_type?: string;

    @IsOptional()
    @IsString()
    card_name?: string;

    @IsOptional()
    @IsString()
    pay_auth_code?: string;

    @IsOptional()
    @IsString()
    card_quota?: string;

    @IsOptional()
    @IsString()
    var1?: string;

    @IsOptional()
    @IsString()
    var2?: string;
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
