// src/modules/auth/infra/utils/cookie-options.ts
import type { CookieOptions } from 'express';

function isProd() {
    return process.env.NODE_ENV === 'production';
}

/**
 * SameSite 정책:
 * - 기본값: dev=lax, prod=lax
 * - 크로스사이트(도메인 완전 다름)로 쿠키 보내야 하면 env로 none 지정
 */
function sameSite(): CookieOptions['sameSite'] {
    const v = (process.env.COOKIE_SAMESITE ?? '').toLowerCase();
    if (v === 'none') return 'none';
    if (v === 'strict') return 'strict';
    return 'lax';
}

function secure(): boolean {
    // SameSite=None이면 Secure=true가 필수라 prod 권장
    if (sameSite() === 'none') return true;
    return isProd();
}

export function cookieBase(path: string): CookieOptions {
    return {
        httpOnly: true,
        secure: secure(),
        sameSite: sameSite(),
        domain: process.env.COOKIE_DOMAIN || undefined,
        path,
    };
}

export function accessCookieOptions(): CookieOptions {
    const maxAgeMs = Number(process.env.JWT_ACCESS_EXPIRES_SEC ?? 900) * 1000;
    return { ...cookieBase('/'), maxAge: maxAgeMs };
}

export function refreshCookieOptions(): CookieOptions {
    const maxAgeMs = Number(process.env.JWT_REFRESH_EXPIRES_SEC ?? 1209600) * 1000;
    return { ...cookieBase('/auth/refresh'), maxAge: maxAgeMs };
}

export function oauthStateCookieOptions(): CookieOptions {
    return {
        ...cookieBase('/auth/kakao/callback'),
        maxAge: 10 * 60 * 1000,
    };
}

export function clearCookieOptions(path: string): CookieOptions {
    return { ...cookieBase(path) };
}
