import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver-v2';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('NAVER_CLIENT_ID'),
            clientSecret: configService.getOrThrow('NAVER_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('NAVER_CALLBACK_URL'),
        });
    }

    validate(_accessToken: string, _refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        try {
            const user: SocialUserAfterOAuth = {
                id: profile.id,
                nickname: profile.nickname ?? profile.name ?? '',
                email: profile.email ?? '',
                socialType: LoginType.NAVER,
            };
            return user;
        } catch (error) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, error);
        }
    }
}
