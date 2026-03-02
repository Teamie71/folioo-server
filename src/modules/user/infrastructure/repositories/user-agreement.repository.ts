import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { TermType } from '../../domain/enums/term-type.enum';

@Injectable()
export class UserAgreementRepository {
    constructor(
        @InjectRepository(UserAgreement)
        private readonly userAgreementRepository: Repository<UserAgreement>
    ) {}

    async save(entity: UserAgreement): Promise<UserAgreement> {
        return this.userAgreementRepository.save(entity);
    }

    async findLatestByUserId(userId: number): Promise<UserAgreement | null> {
        return this.userAgreementRepository.findOne({
            where: { userId },
            order: { id: 'DESC' },
        });
    }

    async findLatestByUserIdAndTermType(
        userId: number,
        termType: TermType
    ): Promise<UserAgreement | null> {
        return this.userAgreementRepository.findOne({
            where: { userId, termType },
            order: { id: 'DESC' },
        });
    }
}
