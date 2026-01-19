import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly configService: ConfigService) {
        super({
            clientID: configService.getOrThrow('KAKAO_CLIENT_ID'),
            clientSecret: configService.getOrThrow('KAKAO_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow('KAKAO_CALLBACK_URL'),
        });
    }

    validate(_accessToken: string, _refreshToken: string, profile: KakaoProfile): Promise<any> {
        try {
            const user = {
                id: String(profile.id),
                nickname: profile.properties?.nickname,
                email: profile.kakao_account?.email,
                profileImage: profile.properties?.profile_image,
                socialType: LoginType.KAKAO,
            };
            return Promise.resolve(user);
        } catch (error) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, error);
        }
    }
}

interface KakaoProfile {
    id: number | string;
    username?: string;
    properties?: {
        nickname?: string;
        profile_image?: string;
    };
    kakao_account?: {
        email?: string;
    };
}
