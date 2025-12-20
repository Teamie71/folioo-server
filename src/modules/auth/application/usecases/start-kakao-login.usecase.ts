// src/modules/auth/application/usecases/start-kakao-login.usecase.ts
import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { KAKAO_OAUTH_PORT } from '../ports/kakao-oauth.port';
import type { KakaoOAuthPort } from '../ports/kakao-oauth.port';
@Injectable()
export class StartKakaoLoginUseCase {
    constructor(@Inject(KAKAO_OAUTH_PORT) private readonly kakao: KakaoOAuthPort) {}

    execute(input: { redirectUri: string }) {
        const state = randomBytes(16).toString('hex');
        const url = this.kakao.buildAuthorizeUrl({ state, redirectUri: input.redirectUri });
        return { state, url };
    }
}
