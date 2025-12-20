export const USER_AUTH_PORT = Symbol('USER_AUTH_PORT');

export type SocialProvider = 'KAKAO';

export interface UserAuthPort {
    findOrCreateBySocial(input: {
        provider: SocialProvider;
        providerUserId: string;
        email?: string | null;
        nickname?: string | null;
        profileImageUrl?: string | null;
    }): Promise<{ userId: string; isActive: boolean }>;

    getProviderUserIdByUserId(input: {
        userId: string;
        provider: SocialProvider;
    }): Promise<string | null>;

    deactivateUser(input: { userId: string }): Promise<void>;
}
