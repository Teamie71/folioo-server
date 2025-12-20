import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KAKAO_OAUTH_PORT } from '../ports/kakao-oauth.port';
import type { KakaoOAuthPort } from '../ports/kakao-oauth.port';
import { USER_AUTH_PORT } from '../ports/user-auth.port';
import type { UserAuthPort } from '../ports/user-auth.port';
import { REFRESH_TOKEN_STORE_PORT } from '../ports/refresh-token-store.port';
import type { RefreshTokenStorePort } from '../ports/refresh-token-store.port';

@Injectable()
export class UnlinkUseCase {
    constructor(
        @Inject(KAKAO_OAUTH_PORT) private readonly kakao: KakaoOAuthPort,
        @Inject(USER_AUTH_PORT) private readonly users: UserAuthPort,
        @Inject(REFRESH_TOKEN_STORE_PORT) private readonly refreshStore: RefreshTokenStorePort
    ) {}

    async execute(input: { userId: string }) {
        const providerUserId = await this.users.getProviderUserIdByUserId({
            userId: input.userId,
            provider: 'KAKAO',
        });
        if (!providerUserId) throw new NotFoundException('Social account not found');

        await this.kakao.unlinkByAdminKey({ targetId: providerUserId });
        await this.refreshStore.deleteByUserId(input.userId);
        await this.users.deactivateUser({ userId: input.userId });

        return { message: 'Unlinked & deactivated' };
    }
}
