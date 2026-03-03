# API Status & Smoke Testing

This document tracks:

- What APIs exist (from controllers and OpenAPI).
- Which endpoints are implemented vs not implemented.
- How to manually obtain an access token and test via Swagger.
- How to run the automated dev smoke tests.

Notes:

- In non-local environments, Swagger UI is mounted at `/api` and protected by Basic Auth.
- Most API endpoints are protected by a global JWT guard and require `Authorization: Bearer <accessToken>`.
- Some endpoints consume tickets (ticket/payment required). Expect `402` when tickets are insufficient.

## Environments

- Dev base URL: `https://dev-api.folioo.ai.kr`
- Swagger UI: `https://dev-api.folioo.ai.kr/api`
- OpenAPI JSON: `https://dev-api.folioo.ai.kr/api-json`
- Health check (public): `https://dev-api.folioo.ai.kr/health`

## Auth Model (How Requests Are Authorized)

- Default: global `JwtAuthGuard` is applied (all routes require access token unless explicitly public).
- Access token is read from `Authorization: Bearer <token>`.
- Refresh token is stored in an `httpOnly` cookie named `refreshToken` and used by `POST /auth/refresh`.

## Manual Testing via Swagger

### Step 1. Open Swagger UI (Basic Auth)

Open:

`https://dev-api.folioo.ai.kr/api`

This may prompt for Basic Auth credentials (configured by `SWAGGER_USER` / `SWAGGER_PASSWORD` in non-local).

### Step 2. Do Kakao or Google login in the browser

Do NOT try to execute OAuth redirects from Swagger.

Open one of these in a new browser tab:

`https://dev-api.folioo.ai.kr/auth/kakao`

`https://dev-api.folioo.ai.kr/auth/google`

After completing the social login flow, the server sets an `httpOnly` cookie `refreshToken` and redirects to the client.

### Step 3. Issue access token using refresh cookie

Back in Swagger:

- Execute `POST /auth/refresh`
- This reads the `refreshToken` cookie and returns a new access token string in `result`

If you see `AUTH4012` (refresh token missing), your browser does not have the `refreshToken` cookie for this domain.

### Step 4. Authorize Swagger with the access token

Click the `Authorize` button and paste the access token.

Swagger will send `Authorization: Bearer <token>` for endpoints that require JWT.

## Automated Smoke Tests (Dev)

We use OpenAPI (`/api-json`) to enumerate endpoints and fire requests against the dev server.

Script:

- `scripts/smoke-dev-api.mjs`

### Run GET-only smoke (safe)

```bash
export FOLIOO_ACCESS_TOKEN="<paste-access-token>"
node scripts/smoke-dev-api.mjs
```

### Run GET + POST/PATCH/DELETE smoke

This will hit mutating endpoints too.

```bash
export FOLIOO_ACCESS_TOKEN="<paste-access-token>"
node scripts/smoke-dev-api.mjs --mutate --exclude '^/auth/(kakao|google|naver)'
```

### Multipart file upload endpoints

By default, multipart/form-data endpoints (e.g. PDF extract) are skipped.
To test them, provide a local file with `--file`:

```bash
node scripts/smoke-dev-api.mjs --mutate --file ./sample.pdf
```

### CLI Options

| Option               | Default                           | Description                        |
| -------------------- | --------------------------------- | ---------------------------------- |
| `--base <url>`       | `https://dev-api.folioo.ai.kr`    | Dev server base URL                |
| `--token-env <name>` | `FOLIOO_ACCESS_TOKEN`             | Env var containing access token    |
| `--mutate`           | off                               | Enable POST/PATCH/DELETE endpoints |
| `--file <path>`      | _(none)_                          | Attach file to multipart endpoints |
| `--delay-ms <n>`     | 120                               | Delay between requests (ms)        |
| `--timeout-ms <n>`   | 15000                             | Per-request timeout (ms)           |
| `--include <regex>`  | _(none)_                          | Only run paths matching regex      |
| `--exclude <regex>`  | _(none)_                          | Skip paths matching regex          |
| `--out <path>`       | `/tmp/folioo_dev_smoke_<ts>.json` | Report output path                 |

### Result Classification

Each endpoint result is classified into one of:

| Classification     | HTTP Status    | Meaning                                 |
| ------------------ | -------------- | --------------------------------------- |
| `implemented`      | 2xx            | Endpoint works correctly                |
| `not_implemented`  | 501            | Endpoint is stubbed / not yet built     |
| `validation_error` | 400            | Payload rejected by DTO validation      |
| `not_found`        | 404            | Resource not found                      |
| `auth_required`    | 401            | Authentication missing or invalid       |
| `payment_required` | 402            | Insufficient tickets                    |
| `server_error`     | 500+ (not 501) | Unexpected server error                 |
| `skipped`          | _(n/a)_        | Skipped by rule (env, multipart, OAuth) |
| `network_error`    | _(n/a)_        | Timeout or connection failure           |

### Environment-Dependent Skipping

Some endpoints are auto-skipped when prerequisite data is unavailable:

- `POST /auth/refresh` - always skipped (needs httpOnly `refreshToken` cookie, not Bearer)
- `POST /payments` - skipped when no ticket products are seeded in the environment
- `GET /auth/kakao`, `GET /auth/google`, `GET /auth/naver`(및 callback 경로) - skipped (OAuth redirect, not meaningful as API call)
- Multipart endpoints - skipped unless `--file` is provided

### Output

The script prints a human-readable classification summary and writes a JSON report under `/tmp`.

The report includes:

- request URL
- HTTP status
- classification category (see table above)
- standardized error code (when provided)
- standardized reason (when provided)
- `classification` - aggregate count per classification category
- `buckets` - legacy HTTP status code buckets (backward-compatible)

## Current Implementation Status (Controllers)

Legend:

- IMPLEMENTED: endpoint has real logic (may still fail due to missing data or tickets)
- NOT_IMPLEMENTED: throws `BusinessException(ErrorCode.NOT_IMPLEMENTED)` -> typically `501`
- EMPTY: controller exists but no routes

### Common

- GET `/health` -> IMPLEMENTED (Public)

### Internal

- GET `/api/v1/internal/health` -> IMPLEMENTED (Public + X-API-Key required)
- GET `/api/v1/internal/insights/{insightId}` -> IMPLEMENTED (AI 서버용 인사이트 단건 조회)
- GET `/api/v1/internal/insights/search` -> IMPLEMENTED (AI 서버용 인사이트 유사도 검색, 코사인 유사도 0~1 반환)

### Auth

- GET `/auth/kakao` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/kakao/callback` -> IMPLEMENTED (Public, OAuth callback)
- POST `/auth/refresh` -> IMPLEMENTED (Public, requires refreshToken cookie)
- POST `/auth/logout` -> IMPLEMENTED
- GET `/auth/google` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/google/callback` -> IMPLEMENTED (Public, OAuth callback)
- GET `/auth/naver` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/naver/callback` -> IMPLEMENTED (Public, OAuth callback)
- POST `/auth/sms/send` -> NOT_IMPLEMENTED
- POST `/auth/sms/verify` -> NOT_IMPLEMENTED

### User

- GET `/users/me` -> IMPLEMENTED
- GET `/users/me/tickets` -> IMPLEMENTED
- GET `/users/me/tickets/expiring` -> IMPLEMENTED
- PATCH `/users/me` -> IMPLEMENTED
- PATCH `/users/me/marketing-consent` -> IMPLEMENTED
- DELETE `/users/me` -> IMPLEMENTED (soft delete + social unlink policy)
    - Provider behavior: Google/Kakao/Naver unlink uses stored OAuth refresh token (Naver/Kakao refresh access token first when needed).

### Experience

- POST `/experiences` -> IMPLEMENTED (consumes tickets, can return `TICKET402`)
- GET `/experiences` -> IMPLEMENTED
- GET `/experiences/{experienceId}` -> IMPLEMENTED
- PATCH `/experiences/{experienceId}` -> IMPLEMENTED

### Portfolio

- GET `/portfolios/{portfolioId}` -> IMPLEMENTED
- PATCH `/portfolios/{portfolioId}` -> IMPLEMENTED
- DELETE `/portfolios/{portfolioId}` -> IMPLEMENTED
- POST `/portfolios/{portfolioId}/export` -> NOT_IMPLEMENTED

### Portfolio-Correction

- GET `/portfolio-corrections` -> IMPLEMENTED
- POST `/portfolio-corrections` -> IMPLEMENTED (consumes tickets, can return `TICKET402`)
- GET `/portfolio-corrections/{correctionId}/status` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}` -> IMPLEMENTED
- POST `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- PATCH `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- POST `/portfolio-corrections/{correctionId}/regenerate-insight` -> NOT_IMPLEMENTED
- POST `/portfolio-corrections/{correctionId}/select` -> IMPLEMENTED (선택 포트폴리오를 매핑 테이블에 활성화 상태로 저장)
- POST `/portfolio-corrections/{correctionId}/generate` -> IMPLEMENTED (요청 본문 없이 활성화된 매핑 기준으로 생성 준비 수행)
- PATCH `/portfolio-corrections/{correctionId}` -> IMPLEMENTED
- DELETE `/portfolio-corrections/{correctionId}` -> IMPLEMENTED

### External Portfolios

- GET `/external-portfolios?correctionId=...` -> IMPLEMENTED
- POST `/external-portfolios` -> IMPLEMENTED
- POST `/external-portfolios/extract` -> IMPLEMENTED (multipart PDF + `correctionId`, busboy 파싱, AI 추출 후 DB 저장)
- PATCH `/external-portfolios/{portfolioId}` -> IMPLEMENTED
- DELETE `/external-portfolios/{portfolioId}` -> IMPLEMENTED

### Insight

- PATCH `/insights/{insightId}` -> IMPLEMENTED (requires existing insightId)
- DELETE `/insights/{insightId}` -> IMPLEMENTED (requires existing insightId)
- ~~GET `/insights/{insightId}` -> IMPLEMENTED (단건 조회, 소유자 검증)~~ (Internal route로 이전)
- GET `/insights` -> IMPLEMENTED
- GET `/insights/summary` -> IMPLEMENTED
- POST `/insights` -> IMPLEMENTED (생성 성공 시 `INSIGHT_LOG_CHALLENGE` 진행도 자동 반영)
- ~~GET `/insights/search` -> IMPLEMENTED~~ (Internal route로 이전)
- GET `/insights/tags` -> IMPLEMENTED
- POST `/insights/tags` -> IMPLEMENTED
- DELETE `/insights/tags/{tagId}` -> IMPLEMENTED

### Ticket

- GET `/ticket-products` -> IMPLEMENTED (Public)

### Payment

- POST `/payments` -> IMPLEMENTED (requires valid ticketProductId)
- GET `/payments/{paymentId}` -> IMPLEMENTED
- POST `/payments/webhook` -> IMPLEMENTED (Public)
- POST `/payments/{paymentId}/cancel` -> IMPLEMENTED

### Event

- GET `/events/{eventCode}/feedback-modal` -> IMPLEMENTED (보상 수령 여부에 따라 피드백 모달 문구/CTA 반환)
- GET `/events/{eventCode}/progress-card` -> IMPLEMENTED (진행도/남은 개수/동적 문구/CTA 반환)
- POST `/events/{eventCode}/reward-claim` -> IMPLEMENTED (완료된 챌린지 보상 직접 수령)
- POST `/events/admin/{eventCode}/feedback-rewards/grants` -> IMPLEMENTED (`@Public`, 운영 수동 지급)
