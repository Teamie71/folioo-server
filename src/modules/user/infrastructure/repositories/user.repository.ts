import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/user.entity';
import { SocialUser } from '../../domain/social-user.entity';
import { Repository } from 'typeorm';

export interface UserWithSocialInfoProjection {
    userId: number;
    name: string;
    phoneNum: string | null;
    status: string;
    isActive: boolean;
    email: string | null;
    loginType: string | null;
}

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async save(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
        });
    }

    async findByPhoneNum(phoneNum: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                phoneNum,
            },
        });
    }

    async findByIdWithProfile(userId: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                id: userId,
            },
            select: {
                name: true,
                phoneNum: true,
            },
        });
    }

    async searchByNameWithSocialInfo(
        name: string,
        limit: number = 20
    ): Promise<UserWithSocialInfoProjection[]> {
        return this.userRepository
            .createQueryBuilder('u')
            .leftJoin(SocialUser, 'su', 'su.user_id = u.id')
            .select([
                'u.id AS "userId"',
                'u.name AS "name"',
                'u.phone_num AS "phoneNum"',
                'u.status AS "status"',
                'u.is_active AS "isActive"',
                'MIN(su.email) AS "email"',
                'MIN(su.login_type) AS "loginType"',
            ])
            .where('u.name ILIKE :name', { name: `%${name}%` })
            .groupBy('u.id')
            .orderBy('u.id', 'ASC')
            .limit(limit)
            .getRawMany<UserWithSocialInfoProjection>();
    }

    async deactivateById(userId: number, deactivatedAt: Date): Promise<boolean> {
        const result = await this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({
                isActive: false,
                deactivatedAt,
            })
            .where('id = :userId', { userId })
            .andWhere('isActive = :isActive', { isActive: true })
            .execute();

        return (result.affected ?? 0) > 0;
    }
}
