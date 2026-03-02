# Redis 설정 가이드

## 환경 변수

| 변수                       | 필수 | 기본값      | 설명                                          |
| -------------------------- | ---- | ----------- | --------------------------------------------- |
| `CACHE_DRIVER`             | X    | `ioredis`   | 캐시 드라이버 (`ioredis` \| `upstash`)        |
| `REDIS_HOST`               | O    | `localhost` | Redis 서버 호스트 (ioredis 드라이버)          |
| `REDIS_PORT`               | O    | `6379`      | Redis 서버 포트 (ioredis 드라이버)            |
| `REDIS_PASSWORD`           | X    | -           | Redis 인증 비밀번호 (설정 시 인증 활성화)     |
| `REDIS_DB`                 | X    | `0`         | Redis DB 인덱스 (0~15)                        |
| `UPSTASH_REDIS_REST_URL`   | X    | -           | Upstash REST URL (`CACHE_DRIVER=upstash` 시)  |
| `UPSTASH_REDIS_REST_TOKEN` | X    | -           | Upstash REST 토큰 (`CACHE_DRIVER=upstash` 시) |

## CACHE_DRIVER 동작

`RedisModule`은 `CACHE_DRIVER` 환경 변수를 읽어 `CachePort` 구현체를 결정합니다.

| 값        | 동작                                                | 상태          |
| --------- | --------------------------------------------------- | ------------- |
| `ioredis` | Docker Redis / 자체 Redis 인스턴스에 ioredis로 연결 | **사용 가능** |
| `upstash` | Upstash REST API 기반 `UpstashCacheAdapter`로 연결  | **사용 가능** |
| 기타      | 앱 시작 시 에러 발생                                | -             |

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

## Dev/Prod 배포 (Secret Manager)

dev/prod는 Secret Manager에서 내려오는 env로 Upstash를 우선 사용합니다.

```bash
docker compose -f docker-compose.dev.yml up -d
```

`.env.dev` 파일:

```env
CACHE_DRIVER=upstash
UPSTASH_REDIS_REST_URL=https://your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

`CACHE_DRIVER`를 비워두더라도 APP_PROFILE이 `dev`/`prod`이고 Upstash REST 키가 있으면 `upstash`가 자동 선택됩니다.

## Prod 배포

`ioredis` 경로를 사용할 때 dev/prod에서 `REDIS_HOST=localhost`는 금지됩니다.
실수 설정은 `scripts/validate-env-contract.py`에서 즉시 실패 처리합니다.

## 연결 확인

애플리케이션 시작 시 다음 로그로 설정 적용 여부를 확인할 수 있습니다:

```
[RedisModule] CachePort 드라이버: upstash
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
RedisService -> CachePort -> UpstashCacheAdapter  (CACHE_DRIVER=upstash)
```

`RedisConfigService.getCacheDriver()`가 환경 변수를 검증하고,
`RedisModule`의 `CachePort` 팩토리가 드라이버에 맞는 어댑터를 반환합니다.

legacy 키(`UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`)도 하위 호환으로 허용되지만,
신규 계약은 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`입니다.
