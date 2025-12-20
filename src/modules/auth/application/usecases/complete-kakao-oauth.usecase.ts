// src/modules/auth/application/usecases/handle-kakao-callback.usecase.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { KakaoOAuthPort } from '../ports/kakao-oauth.port';
import { KAKAO_OAUTH_PORT } from '../ports/kakao-oauth.port';
import type { UserAuthPort } from '../ports/user-auth.port';
import { USER_AUTH_PORT } from '../ports/user-auth.port';
import type { RefreshTokenStorePort } from '../ports/refresh-token-store.port';
import { REFRESH_TOKEN_STORE_PORT } from '../ports/refresh-token-store.port';
import { hashRefreshToken } from '../../infra/utils/token-hash';
import { JwtTokenService } from '../../infra/token/jwt-token-issuer';

@Injectable()
export class CompleteKakaoOauthUseCase {
    constructor(
        @Inject(KAKAO_OAUTH_PORT) private readonly kakao: KakaoOAuthPort,
        @Inject(USER_AUTH_PORT) private readonly socialUser: UserAuthPort,
        @Inject(REFRESH_TOKEN_STORE_PORT) private readonly refreshStore: RefreshTokenStorePort,
        private readonly tokenIssuer: JwtTokenService
    ) {}

    async execute(input: { code: string; state: string; cookieState?: string | null }) {
        if (!input.cookieState || input.cookieState !== input.state) {
            throw new UnauthorizedException('Invalid OAuth state');
        }

        const { accessToken: kakaoAccess } = await this.kakao.exchangeCodeForAccessToken({
            code: input.code,
            redirectUri: this.kakao
                .buildAuthorizeUrl({ state: input.state, redirectUri: '' })
                .split('redirect_uri=')[1],
        });
        const profile = await this.kakao.fetchProfile({ accessToken: kakaoAccess });

        const { userId } = await this.socialUser.findOrCreateBySocial({
            provider: 'KAKAO',
            providerUserId: profile.providerUserId,
            email: profile.email,
            nickname: profile.nickname,
        });

        const pair = await this.tokenIssuer.issuePair(userId);

        await this.refreshStore.upsert({
            userId,
            refreshJti: pair.refreshJti,
            refreshToken: hashRefreshToken(pair.refreshToken),
            expiresAt: new Date(Date.now() + pair.refreshExpiresSec * 1000),
        });

        return { userId, accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    }
}
