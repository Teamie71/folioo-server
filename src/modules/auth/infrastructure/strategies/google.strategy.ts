import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
            scope: ['profile', 'email'],
        });
    }

    validate(_accessToken: string, _refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        try {
            const email = profile.emails?.[0]?.value ?? '';
            const nickname = profile.displayName || profile.name?.givenName || '';
            const user: SocialUserAfterOAuth = {
                id: String(profile.id),
                nickname,
                email,
                socialType: LoginType.GOOGLE,
            };
            return user;
        } catch (error) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, error);
        }
    }
}
