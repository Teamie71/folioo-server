# Folioo Env Contract

This contract defines environment keys for local, dev, and prod.

## Secret Manager Naming

- `folioo-dev-config`
- `folioo-prod-config`

Both secret payloads must keep the same key names used by Finders-style runtime loading.

## GitHub Secrets (CI/CD 전용)

앱 런타임 env와는 별개로 GitHub Actions 워크플로우에서 직접 사용하는 secrets:

| Secret                 | Used by          | Purpose                                             |
| ---------------------- | ---------------- | --------------------------------------------------- |
| `SUPABASE_DEV_DB_URL`  | `deploy-dev.yml` | `supabase db push` 마이그레이션 실행 (`:6543` 금지) |
| `SUPABASE_PROD_DB_URL` | `deploy.yml`     | `supabase db push` 마이그레이션 실행 (`:6543` 금지) |

> Migration URL rule: `SUPABASE_*_DB_URL` must not use transaction pooler port `6543`.
> Use direct/session `5432` connection for migration jobs.

## Required Keys (Secret Manager payload)

- `APP_PROFILE`
- `SUPABASE_DB_URL` (dev/prod 필수 — 앱 런타임 DB 연결)
- `CACHE_DRIVER` (`upstash` for dev/prod)
- `UPSTASH_REDIS_REST_URL` (dev/prod 필수)
- `UPSTASH_REDIS_REST_TOKEN` (dev/prod 필수)
- `DB_HOST` (local fallback only)
- `DB_PORT` (local fallback only)
- `DB_USERNAME` (local fallback only)
- `DB_PASSWORD` (local fallback only)
- `DB_SCHEMA` (local fallback only)
- `REDIS_HOST` (ioredis fallback)
- `REDIS_PORT` (ioredis fallback)
- `JWT_SECRET_TOKEN`
- `JWT_REFRESH_TOKEN`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_CALLBACK_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `NAVER_CALLBACK_URL`
- `CLIENT_REDIRECT_URI`
- `CORS_ORIGINS`
- `AI_BASE_URL`
- `AI_SERVICE_API_KEY`
- `MAIN_BACKEND_API_KEY`
- `SWAGGER_USER`
- `SWAGGER_PASSWORD`
- `OPENROUTER_API_KEY`

## Optional Keys

- `SENTRY_DSN`
- `CACHE_DRIVER`
- `SUPABASE_DB_URL`
- `PAYAPP_USER_ID`
- `PAYAPP_LINK_KEY`
- `PAYAPP_LINK_VALUE`
- `REDIS_PASSWORD`
- `REDIS_DB`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Environment Routing Rules

- local (`.env`): `CACHE_DRIVER=ioredis`, local docker Redis by `REDIS_HOST=localhost`.
- dev/prod (`.env.dev`, `.env.prod`): Redis는 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 경로를 우선 사용한다.
- dev/prod에서 `CACHE_DRIVER`를 생략해도 Upstash REST 키가 모두 있으면 자동으로 `upstash`로 라우팅된다.
- local 프로필은 Upstash를 강제하지 않으며 기본값은 ioredis다.
- dev/prod에서 ioredis 경로를 사용할 경우 `REDIS_HOST=localhost` / `127.0.0.1`는 잘못된 값으로 간주한다.
- Supabase is external and fixed. Only connection values change per env; provider and ownership do not change.

## Input Values You Must Provide

### GCP

- `project_id`
- `region`
- `zone`
- Terraform state bucket name
- WIF provider ID and service account email

### Cloudflare

- `cloudflare_account_id`
- `cloudflare_zone_id`
- API token with DNS + Tunnel + Access permissions

### Supabase (dev/prod each)

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SCHEMA`

### Upstash (dev/prod each)

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Secret JSON Examples

### folioo-dev-config

```json
{
    "APP_PROFILE": "dev",
    "SUPABASE_DB_URL": "postgresql://user:password@host:5432/postgres",
    "CACHE_DRIVER": "upstash",
    "UPSTASH_REDIS_REST_URL": "https://dev-redis.upstash.io",
    "UPSTASH_REDIS_REST_TOKEN": "dev-token",
    "REDIS_HOST": "redis-fallback.internal",
    "REDIS_PORT": "6379",
    "KAKAO_CLIENT_ID": "kakao-client-id",
    "KAKAO_CLIENT_SECRET": "kakao-client-secret",
    "GOOGLE_CLIENT_ID": "google-client-id",
    "GOOGLE_CLIENT_SECRET": "google-client-secret",
    "GOOGLE_CALLBACK_URL": "https://dev-api.folioo.ai.kr/auth/google/callback",
    "NAVER_CLIENT_ID": "naver-client-id",
    "NAVER_CLIENT_SECRET": "naver-client-secret",
    "NAVER_CALLBACK_URL": "https://dev-api.folioo.ai.kr/auth/naver/callback",
    "JWT_SECRET_TOKEN": "jwt-access-secret",
    "JWT_REFRESH_TOKEN": "jwt-refresh-secret",
    "OPENROUTER_API_KEY": "openrouter-api-key"
}
```

### folioo-prod-config

```json
{
    "APP_PROFILE": "prod",
    "SUPABASE_DB_URL": "postgresql://user:password@host:5432/postgres",
    "CACHE_DRIVER": "upstash",
    "UPSTASH_REDIS_REST_URL": "https://prod-redis.upstash.io",
    "UPSTASH_REDIS_REST_TOKEN": "prod-token",
    "REDIS_HOST": "redis-fallback.internal",
    "REDIS_PORT": "6379",
    "KAKAO_CLIENT_ID": "kakao-client-id",
    "KAKAO_CLIENT_SECRET": "kakao-client-secret",
    "GOOGLE_CLIENT_ID": "google-client-id",
    "GOOGLE_CLIENT_SECRET": "google-client-secret",
    "GOOGLE_CALLBACK_URL": "https://prod-api.folioo.ai.kr/auth/google/callback",
    "NAVER_CLIENT_ID": "naver-client-id",
    "NAVER_CLIENT_SECRET": "naver-client-secret",
    "NAVER_CALLBACK_URL": "https://prod-api.folioo.ai.kr/auth/naver/callback",
    "JWT_SECRET_TOKEN": "jwt-access-secret",
    "JWT_REFRESH_TOKEN": "jwt-refresh-secret",
    "OPENROUTER_API_KEY": "openrouter-api-key"
}
```

### OAuth and app secrets

- Kakao client id/secret
- Google client id/secret
- Naver client id/secret
- JWT access/refresh secrets
- OpenRouter API key
- Sentry DSN (if enabled)
- PayApp keys (if enabled)
