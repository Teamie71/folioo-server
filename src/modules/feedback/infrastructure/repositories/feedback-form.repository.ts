import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackForm } from '../../domain/entities/feedback-form.entity';

@Injectable()
export class FeedbackFormRepository {
    constructor(
        @InjectRepository(FeedbackForm)
        private readonly feedbackFormRepository: Repository<FeedbackForm>
    ) {}

    async findById(id: number): Promise<FeedbackForm | null> {
        return this.feedbackFormRepository.findOne({ where: { id } });
    }

    async findLatestByUpdatedAt(): Promise<FeedbackForm | null> {
        return this.feedbackFormRepository
            .createQueryBuilder('form')
            .orderBy('form.updatedAt', 'DESC')
            .addOrderBy('form.id', 'DESC')
            .getOne();
    }
}
