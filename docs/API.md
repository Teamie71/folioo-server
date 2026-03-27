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

### Run Internal API smoke (X-API-Key)

Internal API는 JWT 대신 X-API-Key로 인증하므로 별도 플래그를 사용합니다.

```bash
export FOLIOO_INTERNAL_API_KEY="<paste-api-key>"
node scripts/smoke-dev-api.mjs --internal
```

변형 요청(PATCH/POST) 포함:

```bash
node scripts/smoke-dev-api.mjs --internal --mutate
```

### Multipart file upload endpoints

By default, multipart/form-data endpoints (e.g. PDF extract) are skipped.
To test them, provide a local file with `--file`:

```bash
node scripts/smoke-dev-api.mjs --mutate --file ./sample.pdf
```

### CLI Options

| Option               | Default                           | Description                         |
| -------------------- | --------------------------------- | ----------------------------------- |
| `--base <url>`       | `https://dev-api.folioo.ai.kr`    | Dev server base URL                 |
| `--token-env <name>` | `FOLIOO_ACCESS_TOKEN`             | Env var containing access token     |
| `--mutate`           | off                               | Enable POST/PATCH/DELETE endpoints  |
| `--internal`         | off                               | Run Internal API smoke (X-API-Key)  |
| `--internal-key-env` | `FOLIOO_INTERNAL_API_KEY`         | Env var containing internal API key |
| `--file <path>`      | _(none)_                          | Attach file to multipart endpoints  |
| `--delay-ms <n>`     | 120                               | Delay between requests (ms)         |
| `--timeout-ms <n>`   | 15000                             | Per-request timeout (ms)            |
| `--include <regex>`  | _(none)_                          | Only run paths matching regex       |
| `--exclude <regex>`  | _(none)_                          | Skip paths matching regex           |
| `--out <path>`       | `/tmp/folioo_dev_smoke_<ts>.json` | Report output path                  |

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

### Internal (X-API-Key 인증, AI 서버 연동)

> Internal API는 JWT 대신 `X-API-Key` 헤더로 인증합니다. `@Public()` + `InternalApiKeyGuard` 조합.

#### Insight

- GET `/internal/health` -> IMPLEMENTED (Internal API 헬스 체크)
- GET `/internal/insights/{insightId}` -> IMPLEMENTED (AI 서버용 인사이트 단건 조회)
- GET `/internal/insights/search` -> IMPLEMENTED (AI 서버용 인사이트 유사도 검색, 코사인 유사도 0~1 반환)

#### Portfolio

- GET `/internal/portfolios/{portfolioId}` -> IMPLEMENTED (포트폴리오 원문 조회, AI 첨삭 생성 시 원문 참조)
- PATCH `/internal/portfolios/{portfolioId}` -> IMPLEMENTED (AI 생성 결과 저장 콜백)

#### Correction

- GET `/corrections/{correctionId}` -> IMPLEMENTED (첨삭 데이터 조회, RAG/생성 시 company_name 등 참조)
- PATCH `/corrections/{correctionId}/status` -> IMPLEMENTED (첨삭 상태 전이: NOT_STARTED→DOING_RAG, COMPANY_INSIGHT→GENERATING 등)
- PATCH `/corrections/{correctionId}/company-insight` -> IMPLEMENTED (기업 분석 저장 + 상태→COMPANY_INSIGHT 전이)
- PATCH `/corrections/{correctionId}/result` -> IMPLEMENTED (첨삭 결과 저장 + 상태→DONE 전이)
- POST `/corrections/{correctionId}/rag-data` -> IMPLEMENTED (Tavily RAG 검색 결과 저장)
- GET `/corrections/{correctionId}/rag-data` -> IMPLEMENTED (저장된 RAG 검색 결과 조회, createdAt 오름차순)

### Auth

- GET `/auth/kakao` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/kakao/callback` -> IMPLEMENTED (Public, OAuth callback)
- POST `/auth/refresh` -> IMPLEMENTED (Public, requires refreshToken cookie)
- POST `/auth/logout` -> IMPLEMENTED
- GET `/auth/google` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/google/callback` -> IMPLEMENTED (Public, OAuth callback)
- GET `/auth/naver` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/naver/callback` -> IMPLEMENTED (Public, OAuth callback)

### User

- GET `/users/me` -> IMPLEMENTED
- POST `/users/me/terms` -> IMPLEMENTED (온보딩 약관 동의, `@AllowPending()`)
- GET `/users/me/tickets` -> IMPLEMENTED
- GET `/users/me/tickets/expiring` -> IMPLEMENTED
- GET `/users/me/tickets/history` -> IMPLEMENTED (이용권 사용 이력)
- GET `/users/me/ticket-grant-notices/next` -> IMPLEMENTED (다음 PENDING 보상 안내 1건 조회, 없으면 null)
- PATCH `/users/me/ticket-grant-notices/{noticeId}/shown` -> IMPLEMENTED (보상 안내 shown 처리)
- PATCH `/users/me/ticket-grant-notices/{noticeId}/dismiss` -> IMPLEMENTED (보상 안내 dismiss 처리)
- PATCH `/users/me` -> IMPLEMENTED
- PATCH `/users/me/marketing-consent` -> IMPLEMENTED
- DELETE `/users/me` -> IMPLEMENTED (soft delete + social unlink policy)
    - Provider behavior: Google/Kakao/Naver unlink uses stored OAuth refresh token (Naver/Kakao refresh access token first when needed).

### Experience

- POST `/experiences` -> IMPLEMENTED (consumes tickets, can return `TICKET402`)
- GET `/experiences` -> IMPLEMENTED
- GET `/experiences/{experienceId}` -> IMPLEMENTED
- PATCH `/experiences/{experienceId}` -> IMPLEMENTED
- DELETE `/experiences/{experienceId}` -> IMPLEMENTED (연관 첨삭 있으면 `EXPERIENCE4221` 반환)

### Interview (SSE 스트림)

- POST `/interview/experiences/{experienceId}/session/stream` -> IMPLEMENTED (SSE, 인터뷰 세션 시작)
- POST `/interview/experiences/{experienceId}/messages/stream` -> IMPLEMENTED (SSE, multipart/form-data: `message` + optional `insightId` + optional `files` PDF/image up to 3)
- GET `/interview/experiences/{experienceId}/status` -> IMPLEMENTED (세션 상태 조회)
- POST `/interview/experiences/{experienceId}/portfolio/generate` -> IMPLEMENTED (인터뷰 완료 후 포트폴리오 생성)
- POST `/interview/experiences/{experienceId}/extend/stream` -> IMPLEMENTED (SSE, 연장 모드)

### Portfolio

- GET `/portfolios` -> IMPLEMENTED (사용자의 포트폴리오 목록 조회)
- GET `/portfolios/{portfolioId}` -> IMPLEMENTED
- PATCH `/portfolios/{portfolioId}` -> IMPLEMENTED

### Portfolio-Correction

- GET `/portfolio-corrections` -> IMPLEMENTED
- POST `/portfolio-corrections` -> IMPLEMENTED (`title` required, consumes tickets, can return `TICKET402`)
- GET `/portfolio-corrections/{correctionId}/status` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- GET `/portfolio-corrections/{correctionId}` -> IMPLEMENTED
- POST `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
- PATCH `/portfolio-corrections/{correctionId}/company-insight` -> IMPLEMENTED
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
- GET `/insights` -> IMPLEMENTED
- GET `/insights/summary` -> IMPLEMENTED
- POST `/insights` -> IMPLEMENTED (생성 성공 시 `INSIGHT_LOG_CHALLENGE` 진행도 자동 반영)
- GET `/insights/tags` -> IMPLEMENTED
- POST `/insights/tags` -> IMPLEMENTED
- DELETE `/insights/tags/{tagId}` -> IMPLEMENTED

### Ticket

- GET `/ticket-products` -> IMPLEMENTED (Public)

### Payment

- POST `/payments` -> IMPLEMENTED (requires valid ticketProductId)
- GET `/payments/{paymentId}` -> IMPLEMENTED
- POST `/payments/webhook` -> IMPLEMENTED (Public)
- POST `/payments/{paymentId}/cancel` -> IMPLEMENTED (REQUESTED 상태에서도 취소 허용)

### Event

- GET `/events/{eventCode}/feedback-modal` -> IMPLEMENTED (보상 수령 여부에 따라 피드백 모달 문구/CTA 반환)
- GET `/events/{eventCode}/progress-card` -> IMPLEMENTED (진행도/남은 개수/동적 문구/CTA 반환)
- POST `/events/{eventCode}/reward-claim` -> IMPLEMENTED (완료된 챌린지 보상 직접 수령)
- POST `/events/admin/{eventCode}/feedback-rewards/grants` -> DEPRECATED (레거시 수동 지급 경로, 현재는 `/admin/api/events/{eventCode}/grants` 사용)

### Admin

- GET `/admin/dashboard` -> IMPLEMENTED (React SPA 대시보드 페이지)
- GET `/admin/api/users/search` -> IMPLEMENTED (사용자 검색, 이름/이메일)
- GET `/admin/api/events/manual-reward-options` -> IMPLEMENTED (수동 보상 이벤트 목록, ?userId로 보상 수령 여부 포함)
- POST `/admin/api/events/{eventCode}/grants` -> IMPLEMENTED (이벤트 보상 수동 지급, CS 커스텀 이용권 포함)
- GET `/admin/api/ticket-grants` -> IMPLEMENTED (이용권 지급 ledger + notice 상태 조회)
