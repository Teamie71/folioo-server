import Redis from 'ioredis';
import { CachePort } from './cache.port';

export class IoRedisCacheAdapter extends CachePort {
    constructor(private readonly redis: Redis) {
        super();
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds && ttlSeconds > 0) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
            return;
        }

        await this.redis.set(key, value);
    }

    async del(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async exists(key: string): Promise<boolean> {
        return (await this.redis.exists(key)) === 1;
    }

    async ping(): Promise<string> {
        return this.redis.ping();
    }

    async quit(): Promise<void> {
        await this.redis.quit();
    }
}
