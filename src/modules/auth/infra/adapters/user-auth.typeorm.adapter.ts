import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOrmEntity } from 'src/modules/user/domain/orm/user.orm-entity';
import { UserAuthPort } from '../../application/ports/user-auth.port';

@Injectable()
export class UserAuthTypeormAdapter implements UserAuthPort {
    constructor(
        @InjectRepository(UserOrmEntity) private readonly users: Repository<UserOrmEntity>
    ) {}

    async findOrCreateBySocial(input: {
        provider: 'KAKAO';
        providerUserId: string;
        email?: string | null;
        nickname?: string | null;
        profileImageUrl?: string | null;
    }) {
        let user = await this.users.findOne({
            where: { loginType: input.provider, loginId: input.providerUserId },
        });

        if (!user) {
            user = this.users.create({
                loginType: input.provider,
                loginId: input.providerUserId,
                email: input.email ?? null,
                name: input.nickname ?? '사용자',
                img_url: input.profileImageUrl ?? null,
                credit: 0,
                isActive: true,
            });
            user = await this.users.save(user);
        }

        return { userId: String(user.id), isActive: user.isActive };
    }

    async getProviderUserIdByUserId(input: { userId: string; provider: 'KAKAO' }) {
        const user = await this.users.findOne({ where: { id: Number(input.userId) } });
        if (!user) return null;
        if (user.loginType !== input.provider) return null;
        return user.loginId ?? null;
    }

    async deactivateUser(input: { userId: string }) {
        await this.users.update({ id: Number(input.userId) }, { isActive: false });
    }
}
