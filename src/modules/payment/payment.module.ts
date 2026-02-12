import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './domain/entities/payment.entity';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';
import { PaymentFacade } from './application/facades/payment.facade';
import { PaymentService } from './application/services/payment.service';
import { PaymentController } from './presentation/payment.controller';
import { TicketModule } from '../ticket/ticket.module';

@Module({
    imports: [TypeOrmModule.forFeature([Payment]), TicketModule],
    controllers: [PaymentController],
    providers: [PaymentRepository, PaymentService, PaymentFacade],
    exports: [PaymentService],
})
export class PaymentModule {}
