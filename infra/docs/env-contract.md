# Folioo Env Contract

This contract defines environment keys for local, dev, and prod.

## Source of Truth

- Runtime source of truth: GCP Secret Manager
- Secrets:
    - `folioo-dev-config`
    - `folioo-prod-config`
- GitHub Actions never stores full `.env` blobs anymore (`ENV_DEV`/`ENV_PROD` removed).

## Secret Manager Naming

- `folioo-dev-config`
- `folioo-prod-config`

Both secret payloads must keep the same key names used by workflow/env loading.

## Required Keys

- `APP_PROFILE`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SCHEMA`
- `SUPABASE_DB_URL`
- `REDIS_HOST` (ioredis fallback)
- `REDIS_PORT` (ioredis fallback)
- `JWT_SECRET_TOKEN`
- `JWT_REFRESH_TOKEN`
- `KAKAO_CLIENT_ID`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_CALLBACK_URL`
- `CLIENT_REDIRECT_URI`
- `CORS_ORIGINS`
- `AI_BASE_URL`
- `SWAGGER_USER`
- `SWAGGER_PASSWORD`
- `OPENROUTER_API_KEY`

## Optional Keys

- `SENTRY_DSN`
- `CACHE_DRIVER`
- `DB_HOST` (local profile only)
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
- Dev/prod requires `SUPABASE_DB_URL` and does not allow DB_HOST fallback.

## Local Sync (git-ignored)

To manage current runtime values locally without committing them:

```bash
gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-dev-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.dev

gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-prod-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.prod
```

Both files are ignored by `.gitignore` (`.env.*`).

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

### PostgreSQL Connection (dev/prod each)

- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SCHEMA`
- `SUPABASE_DB_URL`

Current deployment policy for dev/prod is Supabase-only via `SUPABASE_DB_URL`.
GCE-hosted PostgreSQL is not used as runtime DB for dev/prod.

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
    "JWT_SECRET_TOKEN": "jwt-access-secret",
    "JWT_REFRESH_TOKEN": "jwt-refresh-secret",
    "OPENROUTER_API_KEY": "openrouter-api-key"
}
```

### OAuth and app secrets

- Kakao client id/secret
- JWT access/refresh secrets
- OpenRouter API key
- Sentry DSN (if enabled)
- PayApp keys (if enabled)
