import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from '../../config/redis-config';
import { CachePort } from './cache.port';
import { IoRedisCacheAdapter } from './ioredis-cache.adapter';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';
import { UpstashCacheAdapter } from './upstash-cache.adapter';

@Global()
@Module({
    providers: [
        RedisConfigService,
        {
            provide: REDIS_CLIENT,
            useFactory: (redisConfigService: RedisConfigService): Redis | null => {
                const logger = new Logger('RedisModule');
                const driver = redisConfigService.getCacheDriver();

                if (driver === 'upstash') {
                    logger.log('Redis 클라이언트 생성 생략 (driver=upstash)');
                    return null;
                }

                const options = redisConfigService.createRedisOptions();
                const client = new Redis(options);

                client.on('connect', () => {
                    logger.log('Redis 연결 성공');
                });

                client.on('error', (error: Error) => {
                    logger.error(`Redis 연결 에러: ${error.message}`);
                });

                return client;
            },
            inject: [RedisConfigService],
        },
        {
            provide: CachePort,
            useFactory: (
                redisConfigService: RedisConfigService,
                redisClient: Redis | null
            ): CachePort => {
                const logger = new Logger('RedisModule');
                const driver = redisConfigService.getCacheDriver();
                redisConfigService.validateProfileRedisRouting(driver);

                if (driver === 'ioredis') {
                    if (!redisClient) {
                        throw new Error('ioredis 드라이버 초기화 실패: REDIS_CLIENT가 없습니다.');
                    }
                    logger.log('CachePort 드라이버: ioredis');
                    return new IoRedisCacheAdapter(redisClient);
                }

                const upstashConfig = redisConfigService.validateUpstashConfig();
                logger.log('CachePort 드라이버: upstash');
                return new UpstashCacheAdapter(upstashConfig.url, upstashConfig.token);
            },
            inject: [RedisConfigService, REDIS_CLIENT],
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class RedisModule {}
