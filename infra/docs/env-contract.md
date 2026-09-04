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
- `OPENROUTER_API_KEY`

## Optional Keys

- `SENTRY_DSN`
- `SUPABASE_DB_URL`
- `PAYAPP_USER_ID`
- `PAYAPP_LINK_KEY`
- `PAYAPP_LINK_VALUE`
- `CLOUD_TASKS_SERVICE_ACCOUNT_KEY` (로컬 개발 전용. dev/prod GCE에서는 ADC 사용)

## Cloud Tasks Keys (Visualization)

| Key                                       | Required      | Description                                                                                  |
| ----------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `CLOUD_TASKS_PROJECT_ID`                  | dev/prod 필수 | GCP 프로젝트 ID                                                                              |
| `CLOUD_TASKS_LOCATION`                    | dev/prod 필수 | Cloud Tasks 리전 (예: `asia-northeast3`)                                                     |
| `CLOUD_TASKS_VIZ_QUEUE`                   | dev/prod 필수 | 시각화 작업 큐 이름. 큐는 `maxAttempts=2` 로 설정 (1회 재시도)                               |
| `CLOUD_TASKS_WORKER_BASE_URL`             | dev/prod 필수 | AI 워커 base URL (예: `https://worker.a.run.app`). path는 서비스 코드에서 task 종류별로 부여 |
| `CLOUD_TASKS_WORKER_OIDC_SERVICE_ACCOUNT` | dev/prod 필수 | OIDC 토큰 발급용 서비스 계정 이메일                                                          |
| `CLOUD_TASKS_WORKER_OIDC_AUDIENCE`        | dev/prod 필수 | OIDC audience (워커 URL과 동일하게 설정 권장)                                                |
| `VISUALIZATION_CALLBACK_BASE_URL`         | dev/prod 필수 | AI 워커가 콜백을 보낼 서버 base URL (예: `https://api.folioo.kr`)                            |

## Environment Routing Rules

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

## Secret JSON Examples

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
    "OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY": "strong-oauth-token-encryption-key",
    "OPENROUTER_API_KEY": "openrouter-api-key"
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
    "OAUTH_REFRESH_TOKEN_ENCRYPTION_KEY": "strong-oauth-token-encryption-key",
    "OPENROUTER_API_KEY": "openrouter-api-key"
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
