import { CachePort } from './cache.port';

type UpstashResponse<T> = {
    result: T;
    error?: string;
};

export class UpstashCacheAdapter extends CachePort {
    constructor(
        private readonly baseUrl: string,
        private readonly token: string
    ) {
        super();
    }

    async get(key: string): Promise<string | null> {
        const result = await this.execute<string | null>(['GET', key]);
        return result ?? null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds && ttlSeconds > 0) {
            await this.execute(['SET', key, value, 'EX', String(ttlSeconds)]);
            return;
        }

        await this.execute(['SET', key, value]);
    }

    async del(key: string): Promise<number> {
        return this.execute<number>(['DEL', key]);
    }

    async exists(key: string): Promise<boolean> {
        return (await this.execute<number>(['EXISTS', key])) === 1;
    }

    async ping(): Promise<string> {
        return this.execute<string>(['PING']);
    }

    quit(): Promise<void> {
        return Promise.resolve();
    }

    private async execute<T>(command: string[]): Promise<T> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(command),
        });

        if (!response.ok) {
            throw new Error(`Upstash 요청 실패 (${response.status}): ${response.statusText}`);
        }

        const payload = (await response.json()) as UpstashResponse<T>;
        if (payload.error) {
            throw new Error(`Upstash 응답 에러: ${payload.error}`);
        }

        return payload.result;
    }
}
