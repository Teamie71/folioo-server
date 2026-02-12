import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

@Injectable()
export class RedisConfigService {
    private readonly logger = new Logger(RedisConfigService.name);

    constructor(private readonly configService: ConfigService) {}

    createRedisOptions(): RedisOptions {
        const host = this.configService.get<string>('REDIS_HOST', 'localhost');
        const port = this.configService.get<number>('REDIS_PORT', 6379);
        const password = this.configService.get<string>('REDIS_PASSWORD');
        const db = this.configService.get<number>('REDIS_DB', 0);

        this.logger.log(`Redis 설정 로드: ${host}:${port} (DB: ${db})`);

        return {
            host,
            port,
            ...(password && { password }),
            db,
            retryStrategy(times: number): number | null {
                if (times > 10) {
                    return null;
                }
                return Math.min(times * 200, 5000);
            },
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        };
    }
}
