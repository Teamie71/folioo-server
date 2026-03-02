import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { RedisService } from 'src/common/redis/redis.service';
import { TimeUtil } from 'src/common/utils/time.util';

@Injectable()
export class AuthTokenStoreService {
    private readonly refreshTokenPrefix = 'auth:refresh:';
    private readonly accessTokenBlacklistPrefix = 'auth:access:blacklist:';

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    async whitelistRefreshToken(refreshToken: string, userId: number): Promise<void> {
        const ttlSeconds = this.getRefreshTokenTtlSeconds();
        if (ttlSeconds <= 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, '비정상적인 토큰입니다.');
        }

        await this.redisService.set(this.refreshTokenKey(refreshToken), String(userId), ttlSeconds);
    }

    async removeRefreshToken(refreshToken: string): Promise<void> {
        await this.redisService.del(this.refreshTokenKey(refreshToken));
    }

    async isRefreshTokenWhitelisted(refreshToken: string): Promise<boolean> {
        return this.redisService.exists(this.refreshTokenKey(refreshToken));
    }

    async blacklistAccessToken(accessToken: string): Promise<void> {
        const ttlSeconds = this.getAccessTokenTtlSeconds(accessToken);
        if (ttlSeconds <= 0) {
            return;
        }

        await this.redisService.set(this.accessTokenBlacklistKey(accessToken), '1', ttlSeconds);
    }

    async isAccessTokenBlacklisted(accessToken: string): Promise<boolean> {
        return this.redisService.exists(this.accessTokenBlacklistKey(accessToken));
    }

    private refreshTokenKey(token: string): string {
        return `${this.refreshTokenPrefix}${token}`;
    }

    private accessTokenBlacklistKey(token: string): string {
        return `${this.accessTokenBlacklistPrefix}${token}`;
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
