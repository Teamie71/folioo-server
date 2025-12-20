import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { KAKAO_OAUTH_PORT } from '../ports/kakao-oauth.port';
import type { KakaoOAuthPort } from '../ports/kakao-oauth.port';
import { USER_AUTH_PORT } from '../ports/user-auth.port';
import type { UserAuthPort } from '../ports/user-auth.port';
import { REFRESH_TOKEN_STORE_PORT } from '../ports/refresh-token-store.port';
import type { RefreshTokenStorePort } from '../ports/refresh-token-store.port';
import { JwtTokenService } from '../../infra/token/jwt-token-issuer';
import { hashRefreshToken } from '../../infra/utils/token-hash';
@Injectable()
export class KakaoLoginUseCase {
    constructor(
        @Inject(KAKAO_OAUTH_PORT) private readonly kakao: KakaoOAuthPort,
        @Inject(USER_AUTH_PORT) private readonly users: UserAuthPort,
        @Inject(REFRESH_TOKEN_STORE_PORT) private readonly refreshStore: RefreshTokenStorePort,
        private readonly tokenIssuer: JwtTokenService
    ) {}

    async execute(input: { code: string; redirectUri: string }) {
        const { accessToken } = await this.kakao.exchangeCodeForAccessToken({
            code: input.code,
            redirectUri: input.redirectUri,
        });

        const profile = await this.kakao.fetchProfile({ accessToken });

        const user = await this.users.findOrCreateBySocial({
            provider: 'KAKAO',
            providerUserId: profile.providerUserId,
            email: profile.email ?? null,
            nickname: profile.nickname ?? null,
            profileImageUrl: profile.profileImageUrl ?? null,
        });

        if (!user.isActive) throw new UnauthorizedException('Deactivated user');
        const pair = await this.tokenIssuer.issuePair(user.userId);
        await this.refreshStore.upsert({
            userId: user.userId,
            refreshJti: pair.refreshJti,
            refreshToken: hashRefreshToken(pair.refreshToken),
            expiresAt: new Date(Date.now() + pair.refreshExpiresSec * 1000),
        });

        return {
            userId: user.userId,
            accessToken: pair.accessToken, // pair에서 가져오기
            refreshToken: pair.refreshToken, // pair에서 가져오기
        };
    }
}
