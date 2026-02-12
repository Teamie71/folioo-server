# Redis 설정 가이드

## 환경 변수

| 변수             | 필수 | 기본값      | 설명                                     |
| ---------------- | ---- | ----------- | ---------------------------------------- |
| `REDIS_HOST`     | O    | `localhost` | Redis 서버 호스트                        |
| `REDIS_PORT`     | O    | `6379`      | Redis 서버 포트                          |
| `REDIS_PASSWORD` | X    | -           | Redis 인증 비밀번호 (dev/prod 환경 권장) |
| `REDIS_DB`       | X    | `0`         | Redis DB 인덱스 (0~15)                   |

## 로컬 개발

로컬 Redis 인스턴스를 실행한 뒤 `.env` 파일에 다음을 추가합니다:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

로컬 환경에서는 비밀번호 없이 실행할 수 있습니다.

## Dev/Prod 배포

### 환경별 .env 설정

`.env.dev` 또는 `.env.prod` 파일에 다음을 추가합니다:

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-redis-password
```

Docker Compose 내부 네트워크에서 Redis 컨테이너에 접근하므로 호스트는 `redis`를 사용합니다.

`REDIS_PASSWORD`가 설정되면 Redis 서버가 `--requirepass` 옵션으로 시작됩니다.

배포 환경에서는 Redis 서버를 별도 인프라(관리형 Redis 또는 별도 컨테이너)로 운영하고,
애플리케이션에는 환경 변수만 주입합니다.

## 연결 확인

애플리케이션 시작 시 다음 로그로 설정 적용 여부를 확인할 수 있습니다:

```
[RedisConfigService] Redis 설정 로드: redis:6379 (DB: 0)
```

## 사용 방법

`RedisModule`은 `@Global()`로 등록되어 있어 별도의 import 없이 `RedisService`를 주입받아 사용할 수 있습니다:

```typescript
import { RedisService } from 'src/common/redis';

@Injectable()
export class SomeService {
    constructor(private readonly redisService: RedisService) {}

    async example(): Promise<void> {
        const client = this.redisService.getClient();
        await client.set('key', 'value', 'EX', 3600);
        const value = await client.get('key');
    }
}
```

`RedisService.ping()` 또는 실제 Redis 명령 호출 시 연결이 수행되며,
연결 실패는 `RedisModule` 로그에서 확인할 수 있습니다.
