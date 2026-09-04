import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { TimeUtil } from 'src/common/utils/time.util';
import { AuthToken, AuthTokenType } from '../../domain/entities/auth-token.entity';
import { AuthTokenRepository } from '../repositories/auth-token.repository';

@Injectable()
export class AuthTokenStoreService {
    constructor(
        private readonly authTokenRepository: AuthTokenRepository,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    async whitelistRefreshToken(refreshToken: string, userId: number): Promise<void> {
        const ttlSeconds = this.getRefreshTokenTtlSeconds();
        if (ttlSeconds <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, '비정상적인 토큰입니다.');
        }

        const expiresAt = this.toExpiresAt(ttlSeconds);
        await this.authTokenRepository.save(
            AuthToken.create(AuthTokenType.REFRESH, refreshToken, expiresAt, userId)
        );
    }

    async removeRefreshToken(refreshToken: string): Promise<void> {
        await this.authTokenRepository.deleteByToken(AuthTokenType.REFRESH, refreshToken);
    }

    async isRefreshTokenWhitelisted(refreshToken: string): Promise<boolean> {
        return this.authTokenRepository.existsValid(AuthTokenType.REFRESH, refreshToken);
    }

    async blacklistAccessToken(accessToken: string): Promise<void> {
        const ttlSeconds = this.getAccessTokenTtlSeconds(accessToken);
        if (ttlSeconds <= 0) {
            return;
        }

        const expiresAt = this.toExpiresAt(ttlSeconds);
        await this.authTokenRepository.save(
            AuthToken.create(AuthTokenType.ACCESS_BLACKLIST, accessToken, expiresAt)
        );
    }

    async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
        return this.authTokenRepository.existsValid(AuthTokenType.ACCESS_BLACKLIST, accessToken);
    }

    private toExpiresAt(ttlSeconds: number): Date {
        return new Date(Date.now() + ttlSeconds * 1000);
    }

    private getRefreshTokenTtlSeconds(): number {
        const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '14d';
        return TimeUtil.toSec(expiresIn);
    }

    private getAccessTokenTtlSeconds(accessToken: string): number {
        const expFromToken = this.getAccessTokenExp(accessToken);
        if (expFromToken !== null) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            return Math.max(expFromToken - nowSeconds, 0);
        }

        return 0;
    }

    private getAccessTokenExp(accessToken: string): number | null {
        const decoded = this.jwtService.decode<Record<string, unknown>>(accessToken);

        if (decoded === null) {
            return null;
        }

        const expValue = decoded.exp;
        return typeof expValue === 'number' ? expValue : null;
    }
}
