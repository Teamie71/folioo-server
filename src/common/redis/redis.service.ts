import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CachePort } from './cache.port';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(private readonly cachePort: CachePort) {}

    async get(key: string): Promise<string | null> {
        return this.cachePort.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        await this.cachePort.set(key, value, ttlSeconds);
    }

    async del(key: string): Promise<number> {
        return this.cachePort.del(key);
    }

    async exists(key: string): Promise<boolean> {
        return this.cachePort.exists(key);
    }

    async ping(): Promise<string> {
        return this.cachePort.ping();
    }

    async onModuleDestroy(): Promise<void> {
        this.logger.log('Redis 연결 종료');
        await this.cachePort.quit();
    }
}
