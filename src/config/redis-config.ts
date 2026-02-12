import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

const DEFAULT_REDIS_HOST = 'localhost';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;

const MAX_CONNECTION_RETRIES = 10;
const RETRY_DELAY_BASE_MS = 200;
const MAX_RETRY_DELAY_MS = 5000;
const MAX_COMMAND_RETRIES = 3;

@Injectable()
export class RedisConfigService {
    private readonly logger = new Logger(RedisConfigService.name);

    constructor(private readonly configService: ConfigService) {}

    createRedisOptions(): RedisOptions {
        const host = this.configService.get<string>('REDIS_HOST', DEFAULT_REDIS_HOST);
        const port = this.configService.get<number>('REDIS_PORT', DEFAULT_REDIS_PORT);
        const password = this.configService.get<string>('REDIS_PASSWORD');
        const db = this.configService.get<number>('REDIS_DB', DEFAULT_REDIS_DB);

        this.logger.log(`Redis 설정 로드: ${host}:${port} (DB: ${db})`);

        return {
            host,
            port,
            ...(password && { password }),
            db,
            retryStrategy(times: number): number | null {
                if (times > MAX_CONNECTION_RETRIES) {
                    return null;
                }
                return Math.min(times * RETRY_DELAY_BASE_MS, MAX_RETRY_DELAY_MS);
            },
            maxRetriesPerRequest: MAX_COMMAND_RETRIES,
            lazyConnect: true,
        };
    }
}
