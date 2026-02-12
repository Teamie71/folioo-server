import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfigService } from '../../config/redis-config';
import { CachePort } from './cache.port';
import { IoRedisCacheAdapter } from './ioredis-cache.adapter';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
    providers: [
        RedisConfigService,
        {
            provide: REDIS_CLIENT,
            useFactory: (redisConfigService: RedisConfigService): Redis => {
                const logger = new Logger('RedisModule');
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
            provide: IoRedisCacheAdapter,
            useFactory: (redisClient: Redis): IoRedisCacheAdapter => {
                return new IoRedisCacheAdapter(redisClient);
            },
            inject: [REDIS_CLIENT],
        },
        {
            provide: CachePort,
            useExisting: IoRedisCacheAdapter,
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class RedisModule {}
