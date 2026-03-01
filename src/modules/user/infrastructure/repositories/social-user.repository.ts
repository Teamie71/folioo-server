import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginType } from '../../domain/enums/login-type.enum';
import { SocialUser } from '../../domain/social-user.entity';

@Injectable()
export class SocialUserRepository {
    constructor(
        @InjectRepository(SocialUser)
        private readonly socialUserRepository: Repository<SocialUser>
    ) {}

    async save(socialUser: SocialUser): Promise<SocialUser> {
        return await this.socialUserRepository.save(socialUser);
    }

    async findByLoginTypeAndLoginId(
        loginType: LoginType,
        loginId: string
    ): Promise<SocialUser | null> {
        return await this.socialUserRepository.findOne({
            where: {
                loginType,
                loginId,
            },
            relations: {
                user: true,
            },
        });
    }

    async findLatestEmailByUserId(userId: number): Promise<string | null> {
        const socialUser = await this.socialUserRepository.findOne({
            where: {
                userId,
            },
            select: {
                email: true,
            },
            order: {
                id: 'DESC',
            },
        });

        return socialUser?.email ?? null;
    }
}
