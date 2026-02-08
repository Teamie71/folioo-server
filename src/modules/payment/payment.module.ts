import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './domain/entities/payment.entity';
import { PaymentRepository } from './infrastructure/repositories/payment.repository';
import { PaymentService } from './application/services/payment.service';
import { PaymentController } from './presentation/payment.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Payment])],
    controllers: [PaymentController],
    providers: [PaymentRepository, PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
