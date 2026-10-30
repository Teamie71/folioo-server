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
- `DB_HOST` (local fallback only)
- `DB_PORT` (local fallback only)
- `DB_USERNAME` (local fallback only)
- `DB_PASSWORD` (local fallback only)
- `DB_SCHEMA` (local fallback only)
- `JWT_SECRET_TOKEN`
- `JWT_REFRESH_TOKEN`
- `OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY` (dev/prod 필수)
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
- `EXPMAP_TICKET_SECRET` (경험 정리 맵 티켓 서명 키. `AI_SERVICE_API_KEY`/`MAIN_BACKEND_API_KEY`와 별도 로테이션)
- `EXPMAP_TICKET_TTL_SECONDS` (선택, 기본 300)
- `SWAGGER_USER`
- `SWAGGER_PASSWORD`

## Optional Keys

- `SENTRY_DSN`
- `SUPABASE_DB_URL`
- `PAYAPP_USER_ID`
- `PAYAPP_LINK_KEY`
- `PAYAPP_LINK_VALUE`

## Environment Routing Rules

- local (`.env`): local Docker PostgreSQL을 사용합니다.
- dev/prod (`.env.dev`, `.env.prod`): `SUPABASE_DB_URL`로 Supabase PostgreSQL에 연결합니다.
- 인증 토큰은 PostgreSQL의 `auth_token` 테이블에 저장합니다. Redis/Upstash 설정은 사용하지 않습니다.

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

### folioo-dev-config

```json
{
    "APP_PROFILE": "dev",
    "SUPABASE_DB_URL": "postgresql://user:password@host:5432/postgres",
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
    "OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY": "strong-oauth-token-encryption-key"
}
```

### folioo-prod-config

```json
{
    "APP_PROFILE": "prod",
    "SUPABASE_DB_URL": "postgresql://user:password@host:5432/postgres",
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
    "OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY": "strong-oauth-token-encryption-key"
}
```

### OAuth and app secrets

- Kakao client id/secret
- Google client id/secret
- Naver client id/secret
- JWT access/refresh secrets
- OAuth refresh token encryption key
- OpenRouter API key
- Sentry DSN (if enabled)
- PayApp keys (if enabled)
