import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-kakao';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';
import { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('KAKAO_CLIENT_ID'),
            clientSecret: configService.getOrThrow('KAKAO_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('KAKAO_CALLBACK_URL'),
        });
    }

    validate(_accessToken: string, _refreshToken: string, profile: Profile): SocialUserAfterOAuth {
        try {
            const raw = profile._json as unknown as KakaoRawData;
            const user: SocialUserAfterOAuth = {
                id: String(raw.id),
                nickname: raw.kakao_account?.profile?.nickname || raw.properties?.nickname || '',
                email: raw.kakao_account?.email || '',
                socialType: LoginType.KAKAO,
            };
            return user;
        } catch (error) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, error);
        }
    }
}

interface KakaoAccount {
    profile?: {
        nickname?: string;
    };
    email?: string;
}

interface KakaoRawData {
    id: number;
    properties?: {
        nickname?: string;
    };
    kakao_account?: KakaoAccount;
}
