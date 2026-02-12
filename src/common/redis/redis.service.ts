import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    getClient(): Redis {
        return this.redis;
    }

    async ping(): Promise<string> {
        return this.redis.ping();
    }

    async onModuleDestroy(): Promise<void> {
        this.logger.log('Redis 연결 종료');
        await this.redis.quit();
    }
}
