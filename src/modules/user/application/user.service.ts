import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../infra/user.repository';
import { UserAuthPort, SocialProvider } from '../../auth/application/ports/user-auth.port';

@Injectable()
export class UserService implements UserAuthPort {
    constructor(private readonly userRepo: UserRepository) {}

    async findOrCreateBySocial(input: {
        provider: SocialProvider; // 'KAKAO'
        providerUserId: string;
        email?: string | null;
        nickname?: string | null;
        profileImageUrl?: string | null;
    }): Promise<{ userId: string; isActive: boolean }> {
        const loginType: SocialProvider = input.provider; // 'KAKAO'
        const loginId = input.providerUserId;

        // loginType 변수 정의해서 넘기기
        let user = await this.userRepo.findBySocial(loginType, loginId);

        if (!user) {
            user = this.userRepo.create({
                name: input.nickname ?? null,
                email: input.email ?? null,
                loginType, //  ERD의 loginType (KAKAO)
                loginId, // ERD의 loginId
                img_url: input.profileImageUrl ?? null,
                credit: 0,
                isActive: true,
            });
        } else {
            // 기존 유저면 업데이트 + 재활성화
            user.name = input.nickname ?? user.name;
            user.email = input.email ?? user.email;
            user.img_url = input.profileImageUrl ?? user.img_url;
            user.isActive = true;
        }

        const saved = await this.userRepo.save(user);

        return { userId: String(saved.id), isActive: saved.isActive };
    }

    // ✅ 포트 이름이랑 똑같이 맞추기
    async getProviderUserIdByUserId(input: {
        userId: string;
        provider: SocialProvider;
    }): Promise<string | null> {
        const user = await this.userRepo.findById(Number(input.userId));
        if (!user) throw new NotFoundException('User not found');

        // provider가 KAKAO가 아닌 계정이면 null
        if (user.loginType !== input.provider) return null;

        return String(user.loginId);
    }

    async deactivateUser(input: { userId: string }): Promise<void> {
        await this.userRepo.deactivate(Number(input.userId)); // 내부에서 isActive=false 처리
    }
}
