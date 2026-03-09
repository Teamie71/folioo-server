import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';

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

    async findByMulNo(mulNo: number): Promise<Payment | null> {
        return this.paymentRepository.findOne({ where: { mulNo } });
    }

    async updatePaidIfRequested(
        id: number,
        update: Partial<Payment>
    ): Promise<{ updated: boolean }> {
        const result = await this.paymentRepository
            .createQueryBuilder()
            .update(Payment)
            .set({ ...update, updatedAt: new Date() })
            .where('id = :id', { id })
            .andWhere('status = :status', { status: PaymentStatus.REQUESTED })
            .execute();

        return { updated: (result.affected ?? 0) > 0 };
    }
}
