import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

const SUPPORTED_CACHE_DRIVERS = ['ioredis', 'upstash'] as const;
type CacheDriver = (typeof SUPPORTED_CACHE_DRIVERS)[number];

const DEFAULT_CACHE_DRIVER: CacheDriver = 'ioredis';
const DEFAULT_REDIS_HOST = 'localhost';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;
const LOCAL_REDIS_HOSTS = new Set(['localhost', '127.0.0.1']);

const MAX_CONNECTION_RETRIES = 10;
const RETRY_DELAY_BASE_MS = 200;
const MAX_RETRY_DELAY_MS = 5000;
const MAX_COMMAND_RETRIES = 3;

@Injectable()
export class RedisConfigService {
    private readonly logger = new Logger(RedisConfigService.name);

    constructor(private readonly configService: ConfigService) {}

    getCacheDriver(): CacheDriver {
        const raw = this.configService.get<string>('CACHE_DRIVER');

        if (!raw) {
            return this.inferCacheDriverFromProfile();
        }

        if (!(SUPPORTED_CACHE_DRIVERS as readonly string[]).includes(raw)) {
            throw new Error(
                `지원하지 않는 CACHE_DRIVER: "${raw}". ` +
                    `사용 가능한 값: ${SUPPORTED_CACHE_DRIVERS.join(', ')}`
            );
        }

        return raw as CacheDriver;
    }

    validateUpstashConfig(): { url: string; token: string } {
        const url =
            this.configService.get<string>('UPSTASH_REDIS_REST_URL') ||
            this.configService.get<string>('UPSTASH_REDIS_URL');
        const token =
            this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN') ||
            this.configService.get<string>('UPSTASH_REDIS_TOKEN');

        if (!url || !token) {
            throw new Error(
                'CACHE_DRIVER=upstash 설정 시 UPSTASH_REDIS_REST_URL과 UPSTASH_REDIS_REST_TOKEN 환경 변수가 필요합니다.'
            );
        }

        return { url, token };
    }

    validateProfileRedisRouting(driver: CacheDriver): void {
        const profile = this.configService.get<string>('APP_PROFILE', 'local');

        if (profile === 'local') {
            return;
        }

        const host = this.configService.get<string>('REDIS_HOST', DEFAULT_REDIS_HOST);
        if (LOCAL_REDIS_HOSTS.has(host)) {
            throw new Error(
                `${profile} 프로필에서 REDIS_HOST=${host} 는 허용되지 않습니다. ` +
                    '로컬 전용 값이므로 Upstash(REST) 또는 원격 Redis 엔드포인트를 사용하세요.'
            );
        }

        if (driver === 'upstash') {
            this.validateUpstashConfig();
            return;
        }
    }

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

    private inferCacheDriverFromProfile(): CacheDriver {
        const profile = this.configService.get<string>('APP_PROFILE', 'local');
        const hasUpstashRestUrl = Boolean(
            this.configService.get<string>('UPSTASH_REDIS_REST_URL') ||
                this.configService.get<string>('UPSTASH_REDIS_URL')
        );
        const hasUpstashRestToken = Boolean(
            this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN') ||
                this.configService.get<string>('UPSTASH_REDIS_TOKEN')
        );

        if (profile !== 'local' && hasUpstashRestUrl && hasUpstashRestToken) {
            return 'upstash';
        }

        return DEFAULT_CACHE_DRIVER;
    }
}
