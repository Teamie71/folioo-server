export const KAKAO_OAUTH_PORT = Symbol('KAKAO_OAUTH_PORT');

export type KakaoProfile = {
    providerUserId: string; // kakao user id
    email?: string | null;
    nickname?: string | null;
    profileImageUrl?: string | null;
};

export interface KakaoOAuthPort {
    buildAuthorizeUrl(input: { state: string; redirectUri: string }): string;
    exchangeCodeForAccessToken(input: {
        code: string;
        redirectUri: string;
    }): Promise<{ accessToken: string }>;
    fetchProfile(input: { accessToken: string }): Promise<KakaoProfile>;
    unlinkByAdminKey(input: { targetId: string }): Promise<void>;
}
