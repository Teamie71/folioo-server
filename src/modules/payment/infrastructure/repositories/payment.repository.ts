import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../domain/entities/payment.entity';

@Injectable()
export class PaymentRepository {
    constructor(
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>
    ) {}

    async save(entity: Payment): Promise<Payment> {
        return this.paymentRepository.save(entity);
    }

    async findById(id: number): Promise<Payment | null> {
        return this.paymentRepository.findOne({ where: { id } });
    }

    async findByIdAndUserId(id: number, userId: number): Promise<Payment | null> {
        return this.paymentRepository.findOne({ where: { id, userId } });
    }

    async existsById(id: number): Promise<boolean> {
        return this.paymentRepository.exists({ where: { id } });
    }

    async existsByMulNo(mulNo: number): Promise<boolean> {
        return this.paymentRepository.exists({ where: { mulNo } });
    }
}
