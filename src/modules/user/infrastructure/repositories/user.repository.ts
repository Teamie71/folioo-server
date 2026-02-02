import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/user.entity';
import { Repository, UpdateResult } from 'typeorm';
import { LoginType } from '../../domain/enums/login-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async save(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async findBySocialIdAndSocialType(
        socialId: string,
        socialType: LoginType
    ): Promise<User | null> {
        return await this.userRepository.findOne({
            where: {
                socialId,
                socialType,
            },
        });
    }

    async findByIdOrThrow(id: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    async deductCredit(userId: number, amount: number): Promise<UpdateResult> {
        return this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({ credit: () => '"credit" - :amount' })
            .setParameter('amount', amount)
            .where('id = :userId', { userId })
            .andWhere('credit >= :amount', { amount })
            .execute();
    }

    async findByIdWithProfile(userId: number): Promise<User> {
        const user = await this.userRepository.findOne({
            where: {
                id: userId,
            },
            select: {
                name: true,
                email: true,
                phoneNum: true,
            },
        });
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }
}
