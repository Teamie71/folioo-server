// src/modules/auth/application/usecases/refresh.usecase.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { REFRESH_TOKEN_STORE_PORT } from '../ports/refresh-token-store.port';
import type { RefreshTokenStorePort } from '../ports/refresh-token-store.port';
import { JwtTokenService } from '../../infra/token/jwt-token-issuer';
import { equalsHash, hashRefreshToken } from '../../infra/utils/token-hash';

@Injectable()
export class RefreshUseCase {
    constructor(
        @Inject(REFRESH_TOKEN_STORE_PORT) private readonly store: RefreshTokenStorePort,
        private readonly jwt: JwtTokenService
    ) {}

    async execute(input: { refreshToken: string }) {
        const { userId } = this.jwt.verifyRefresh(input.refreshToken);

        const stored = await this.store.findByUserId(userId);
        if (!stored) throw new UnauthorizedException('No refresh token stored');
        if (stored.expiresAt.getTime() < Date.now())
            throw new UnauthorizedException('Refresh expired');

        const incomingHash = hashRefreshToken(input.refreshToken);
        if (!equalsHash(stored.refreshToken, incomingHash)) {
            throw new UnauthorizedException('Refresh token mismatch');
        }

        // rotation
        const pair = await this.jwt.issuePair(userId);

        await this.store.upsert({
            userId,
            refreshJti: pair.refreshJti,
            refreshToken: hashRefreshToken(pair.refreshToken),
            expiresAt: new Date(Date.now() + pair.refreshExpiresSec * 1000),
        });

        return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
    }
}
