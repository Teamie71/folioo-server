// src/modules/auth/infra/utils/token-hash.ts
import { createHash, timingSafeEqual } from 'crypto';

export function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function equalsHash(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
}
