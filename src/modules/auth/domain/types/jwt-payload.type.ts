import { LoginType } from 'src/modules/user/domain/enums/login-type.enum';

export interface JwtPayload {
    sub: number;
    email: string;
}

export interface SocialUserAfterOAuth {
    id: string;
    nickname: string;
    email: string;
    profileImage: string;
    socialType: LoginType;
}

export type UserAfterAuth = JwtPayload & {
    refreshToken?: string;
};
