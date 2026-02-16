# Redis 설정 가이드

## 환경 변수

| 변수                  | 필수 | 기본값      | 설명                                           |
| --------------------- | ---- | ----------- | ---------------------------------------------- |
| `CACHE_DRIVER`        | X    | `ioredis`   | 캐시 드라이버 (`ioredis` \| `upstash`)         |
| `REDIS_HOST`          | O    | `localhost` | Redis 서버 호스트 (ioredis 드라이버)           |
| `REDIS_PORT`          | O    | `6379`      | Redis 서버 포트 (ioredis 드라이버)             |
| `REDIS_PASSWORD`      | X    | -           | Redis 인증 비밀번호 (설정 시 인증 활성화)      |
| `REDIS_DB`            | X    | `0`         | Redis DB 인덱스 (0~15)                         |
| `UPSTASH_REDIS_URL`   | X    | -           | Upstash Redis URL (`CACHE_DRIVER=upstash` 시)  |
| `UPSTASH_REDIS_TOKEN` | X    | -           | Upstash Redis 토큰 (`CACHE_DRIVER=upstash` 시) |

## CACHE_DRIVER 동작

`RedisModule`은 `CACHE_DRIVER` 환경 변수를 읽어 `CachePort` 구현체를 결정합니다.

| 값        | 동작                                                       | 상태          |
| --------- | ---------------------------------------------------------- | ------------- |
| `ioredis` | Docker Redis / 자체 Redis 인스턴스에 ioredis로 연결        | **사용 가능** |
| `upstash` | 환경 변수 검증 후 미구현 에러 (`UpstashCacheAdapter` 필요) | 미구현        |
| 기타      | 앱 시작 시 에러 발생                                       | -             |

미설정 시 기본값은 `ioredis`입니다.

## 로컬 개발 (Docker Compose)

`docker-compose.yml`에 Redis 서비스가 포함되어 있습니다.

```bash
docker compose up -d
pnpm run start:dev
```

`.env` 파일:

```env
CACHE_DRIVER=ioredis
REDIS_HOST=localhost
REDIS_PORT=6379
```

로컬에서는 Redis가 `6379` 포트로 노출되므로 `localhost`로 접근합니다.
비밀번호 없이 실행됩니다.

## Dev 배포 (Docker Compose)

`docker-compose.dev.yml`에 Redis 서비스가 포함되어 있습니다.

```bash
docker compose -f docker-compose.dev.yml up -d
```

`.env.dev` 파일:

```env
CACHE_DRIVER=ioredis
REDIS_HOST=redis
REDIS_PORT=6379
```

Docker Compose 내부 네트워크에서 서비스명 `redis`로 접근합니다.

## Prod 배포

현재 prod에서는 dev와 동일하게 `ioredis` 드라이버를 사용합니다.
향후 Upstash 전환 시 `CACHE_DRIVER=upstash`로 변경하고 `UpstashCacheAdapter`를 구현하면 됩니다.

## 연결 확인

애플리케이션 시작 시 다음 로그로 설정 적용 여부를 확인할 수 있습니다:

```
[RedisConfigService] Redis 설정 로드: redis:6379 (DB: 0)
[RedisModule] CachePort 드라이버: ioredis
[RedisModule] Redis 연결 성공
```

## 사용 방법

`RedisModule`은 `@Global()`로 등록되어 있어 별도의 import 없이 `RedisService`를 주입받아 사용할 수 있습니다.

`RedisService`는 내부적으로 `CachePort` 추상화에 의존하고,
`CACHE_DRIVER`에 따라 적절한 구현체가 바인딩됩니다.

```typescript
import { RedisService } from 'src/common/redis';

@Injectable()
export class SomeService {
    constructor(private readonly redisService: RedisService) {}

    async example(): Promise<void> {
        await this.redisService.set('key', 'value', 3600);
        const value = await this.redisService.get('key');
        const exists = await this.redisService.exists('key');

        if (exists) {
            await this.redisService.del('key');
        }
    }
}
```

## DIP 적용 구조

```text
RedisService -> CachePort -> IoRedisCacheAdapter (CACHE_DRIVER=ioredis)
RedisService -> CachePort -> UpstashCacheAdapter  (CACHE_DRIVER=upstash, 미구현)
```

`RedisConfigService.getCacheDriver()`가 환경 변수를 검증하고,
`RedisModule`의 `CachePort` 팩토리가 드라이버에 맞는 어댑터를 반환합니다.

Upstash를 도입할 때는 `UpstashCacheAdapter`를 추가하고 `CachePort` 팩토리의 `upstash` 분기를 구현하면 됩니다.
