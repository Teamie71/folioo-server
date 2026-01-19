import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../domain/types/jwt-payload.type';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(confingService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.['refreshToken'] as string | null;
                },
            ]),
            secretOrKey: confingService.getOrThrow<string>('JWT_REFRESH_TOKEN'),
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: JwtPayload) {
        const refreshToken = req.cookies?.refreshToken as string | null;

        return { userId: payload.sub, email: payload.email, refreshToken };
    }
}
