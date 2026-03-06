import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { Term } from '../../domain/term.entity';
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

    async findByUserIdAndTermId(userId: number, termId: number): Promise<UserAgreement | null> {
        return this.userAgreementRepository.findOne({
            where: { userId, termId },
        });
    }

    async findByUserIdAndTermType(
        userId: number,
        termType: TermType
    ): Promise<UserAgreement | null> {
        return this.userAgreementRepository
            .createQueryBuilder('ua')
            .innerJoin(Term, 'term', 'term.id = ua.term_id')
            .where('ua.user_id = :userId', { userId })
            .andWhere('term.term_type = :termType', { termType })
            .andWhere('term.is_active = true')
            .orderBy('ua.id', 'DESC')
            .getOne();
    }
}
