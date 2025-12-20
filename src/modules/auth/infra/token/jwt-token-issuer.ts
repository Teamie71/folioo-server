// src/modules/auth/infra/token/jwt-token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

type AccessPayload = { sub: string; typ: 'access' };
type RefreshPayload = { sub: string; typ: 'refresh'; jti: string };

@Injectable()
export class JwtTokenService {
    constructor(private readonly jwt: JwtService) {}

    async issuePair(userId: string) {
        const accessExpiresSec = Number(process.env.JWT_ACCESS_EXPIRES_SEC ?? 900);
        const refreshExpiresSec = Number(process.env.JWT_REFRESH_EXPIRES_SEC ?? 1209600);

        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!accessSecret || !refreshSecret) throw new Error('JWT secrets are not set');

        const accessToken = await this.jwt.signAsync(
            { sub: userId, typ: 'access' } satisfies AccessPayload,
            { secret: accessSecret, expiresIn: accessExpiresSec }
        );

        const refreshJti = randomUUID();
        const refreshToken = await this.jwt.signAsync(
            { sub: userId, typ: 'refresh', jti: refreshJti } satisfies RefreshPayload,
            { secret: refreshSecret, expiresIn: refreshExpiresSec }
        );

        return { accessToken, refreshToken, refreshJti, accessExpiresSec, refreshExpiresSec };
    }

    verifyAccess(token: string): { userId: string } {
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        if (!accessSecret) throw new Error('JWT_ACCESS_SECRET missing');
        const payload = this.jwt.verify(token, { secret: accessSecret }) as AccessPayload;
        if (payload.typ !== 'access') throw new UnauthorizedException('Invalid access token');
        return { userId: String(payload.sub) };
    }

    verifyRefresh(token: string): { userId: string; jti: string } {
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET missing');
        const payload = this.jwt.verify(token, { secret: refreshSecret }) as RefreshPayload;
        if (payload.typ !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
        return { userId: String(payload.sub), jti: String(payload.jti) };
    }
}
