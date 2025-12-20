export const REFRESH_TOKEN_STORE_PORT = Symbol('REFRESH_TOKEN_STORE_PORT');

export interface RefreshTokenStorePort {
    upsert(input: {
        userId: string;
        refreshToken: string; // (MVP) 토큰 원문 or (권장) 해시
        refreshJti?: string; //  추가
        expiresAt: Date;
    }): Promise<void>;

    findByUserId(userId: string): Promise<{
        userId: string;
        refreshToken: string;
        refreshJti?: string | null;
        expiresAt: Date;
    } | null>;

    deleteByUserId(userId: string): Promise<void>;
}
