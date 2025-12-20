// src/modules/auth/infra/adapters/kakao-oauth.client.ts
import { Injectable } from '@nestjs/common';
import { KakaoOAuthPort } from '../../application/ports/kakao-oauth.port';

function qs(params: Record<string, string>) {
    return new URLSearchParams(params).toString();
}

interface KakaoProfile {
    providerUserId: string;
    email: string | null;
    nickname: string | null;
    profileImageUrl: string | null;
}

@Injectable()
export class KakaoOAuthClient implements KakaoOAuthPort {
    private readonly clientId = process.env.KAKAO_REST_API_KEY!;
    private readonly authorizeBase = 'https://kauth.kakao.com/oauth/authorize';
    exchangeCodeForAccessToken(input: {
        code: string;
        redirectUri: string;
    }): Promise<{ accessToken: string }> {
        return this.exchangeCodeForToken(input);
    }

    fetchProfile(input: { accessToken: string }): Promise<KakaoProfile> {
        return this.getUserProfile(input);
    }
    buildAuthorizeUrl(input: { state: string; redirectUri: string }): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: input.redirectUri,
            state: input.state,
        });

        return `${this.authorizeBase}?${params.toString()}`;
    }

    async exchangeCodeForToken(input: { code: string; redirectUri: string }) {
        const clientId = process.env.KAKAO_REST_API_KEY!;
        const clientSecret = process.env.KAKAO_CLIENT_SECRET; // 선택
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            redirect_uri: input.redirectUri,
            code: input.code,
        });
        if (clientSecret) body.set('client_secret', clientSecret);

        const res = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body,
        });

        if (!res.ok) throw new Error(`Kakao token exchange failed: ${res.status}`);
        const data: any = await res.json();
        return { accessToken: String(data.access_token) };
    }

    async getUserProfile(input: { accessToken: string }) {
        const res = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${input.accessToken}` },
        });
        if (!res.ok) throw new Error(`Kakao profile failed: ${res.status}`);
        const data: any = await res.json();

        const id = String(data.id);
        const email = data.kakao_account?.email ?? null;
        const nickname = data.kakao_account?.profile?.nickname ?? null;
        const profileImageUrl = data.kakao_account?.profile?.profile_image_url ?? null;

        return { providerUserId: id, email, nickname, profileImageUrl };
    }

    async unlinkByAdminKey(input: { targetId: string }): Promise<void> {
        const adminKey = process.env.KAKAO_ADMIN_KEY;
        if (!adminKey) throw new Error('KAKAO_ADMIN_KEY missing');

        const body = new URLSearchParams({
            target_id_type: 'user_id',
            target_id: input.targetId,
        });

        const res = await fetch('https://kapi.kakao.com/v1/user/unlink', {
            method: 'POST',
            headers: {
                Authorization: `KakaoAK ${adminKey}`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body,
        });

        if (!res.ok) throw new Error(`Kakao unlink failed: ${res.status}`);
    }
}
