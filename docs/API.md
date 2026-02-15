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

- Dev base URL: `https://folioo-dev-api.log8.kr`
- Swagger UI: `https://folioo-dev-api.log8.kr/api`
- OpenAPI JSON: `https://folioo-dev-api.log8.kr/api-json`
- Health check (public): `https://folioo-dev-api.log8.kr/health`

## Auth Model (How Requests Are Authorized)

- Default: global `JwtAuthGuard` is applied (all routes require access token unless explicitly public).
- Access token is read from `Authorization: Bearer <token>`.
- Refresh token is stored in an `httpOnly` cookie named `refreshToken` and used by `POST /auth/refresh`.

## Manual Testing via Swagger

### Step 1. Open Swagger UI (Basic Auth)

Open:

`https://folioo-dev-api.log8.kr/api`

This may prompt for Basic Auth credentials (configured by `SWAGGER_USER` / `SWAGGER_PASSWORD` in non-local).

### Step 2. Do Kakao login in the browser

Do NOT try to execute OAuth redirects from Swagger.

Open this in a new browser tab:

`https://folioo-dev-api.log8.kr/auth/kakao`

After completing the Kakao flow, the server sets an `httpOnly` cookie `refreshToken` and redirects to the client.

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

### Output

The script prints a summary and writes a JSON report under `/tmp`.

The report includes:

- request URL
- HTTP status
- standardized error code (when provided)
- standardized reason (when provided)

## Current Implementation Status (Controllers)

Legend:

- IMPLEMENTED: endpoint has real logic (may still fail due to missing data or tickets)
- NOT_IMPLEMENTED: throws `BusinessException(ErrorCode.NOT_IMPLEMENTED)` -> typically `501`
- EMPTY: controller exists but no routes

### Common

- GET `/health` -> IMPLEMENTED (Public)

### Auth

- GET `/auth/kakao` -> IMPLEMENTED (Public, OAuth redirect)
- GET `/auth/kakao/callback` -> IMPLEMENTED (Public, OAuth callback)
- POST `/auth/refresh` -> IMPLEMENTED (Public, requires refreshToken cookie)
- POST `/auth/logout` -> NOT_IMPLEMENTED
- POST `/auth/kakao/unlink` -> NOT_IMPLEMENTED
- GET `/auth/google` -> NOT_IMPLEMENTED
- GET `/auth/google/callback` -> NOT_IMPLEMENTED
- POST `/auth/google/unlink` -> NOT_IMPLEMENTED
- GET `/auth/naver` -> NOT_IMPLEMENTED
- GET `/auth/naver/callback` -> NOT_IMPLEMENTED
- POST `/auth/naver/unlink` -> NOT_IMPLEMENTED
- POST `/auth/sms/send` -> NOT_IMPLEMENTED
- POST `/auth/sms/verify` -> NOT_IMPLEMENTED

### User

- GET `/users/me` -> IMPLEMENTED
- PATCH `/users/me` -> NOT_IMPLEMENTED
- PATCH `/users/me/marketing-consent` -> NOT_IMPLEMENTED

### Experience

- POST `/experiences` -> IMPLEMENTED (consumes tickets, can return `TICKET402`)
- GET `/experiences` -> IMPLEMENTED
- GET `/experiences/:experienceId` -> IMPLEMENTED
- PATCH `/experiences/:experienceId` -> IMPLEMENTED

### Portfolio

- GET `/portfolios/:portfolioId` -> IMPLEMENTED
- PATCH `/portfolios/:portfolioId` -> NOT_IMPLEMENTED
- DELETE `/portfolios/:portfolioId` -> NOT_IMPLEMENTED
- POST `/portfolios/:portfolioId/export` -> NOT_IMPLEMENTED

### Portfolio-Correction

- GET `/portfolio-corrections` -> IMPLEMENTED
- POST `/portfolio-corrections` -> IMPLEMENTED (consumes tickets, can return `TICKET402`)
- GET `/portfolio-corrections/:correctionId/status` -> IMPLEMENTED
- GET `/portfolio-corrections/:correctionId/company-insight` -> IMPLEMENTED
- GET `/portfolio-corrections/:correctionId` -> IMPLEMENTED
- POST `/portfolio-corrections/:correctionId/company-insight` -> NOT_IMPLEMENTED
- PATCH `/portfolio-corrections/:correctionId/company-insight` -> NOT_IMPLEMENTED
- POST `/portfolio-corrections/:correctionId/regenerate-insight` -> NOT_IMPLEMENTED
- POST `/portfolio-corrections/:correctionId/select` -> NOT_IMPLEMENTED
- POST `/portfolio-corrections/:correctionId/generate` -> NOT_IMPLEMENTED
- PATCH `/portfolio-corrections/:correctionId` -> NOT_IMPLEMENTED
- DELETE `/portfolio-corrections/:correctionId` -> NOT_IMPLEMENTED

### External Portfolios

- GET `/external-portfolios?correctionId=...` -> IMPLEMENTED
- POST `/external-portfolios` -> IMPLEMENTED
- POST `/external-portfolios/extract` -> NOT_IMPLEMENTED (multipart PDF)
- PATCH `/external-portfolios/:portfolioId` -> NOT_IMPLEMENTED
- DELETE `/external-portfolios/:portfolioId` -> NOT_IMPLEMENTED

### Insight

- PATCH `/insights/:insightId` -> IMPLEMENTED (requires existing insightId)
- DELETE `/insights/:insightId` -> IMPLEMENTED (requires existing insightId)
- GET `/insights` -> NOT_IMPLEMENTED
- POST `/insights` -> NOT_IMPLEMENTED
- GET `/insights/search` -> NOT_IMPLEMENTED
- GET `/insights/tags` -> NOT_IMPLEMENTED
- POST `/insights/tags` -> NOT_IMPLEMENTED
- DELETE `/insights/tags/:tagId` -> NOT_IMPLEMENTED

### Ticket

- GET `/ticket-products` -> IMPLEMENTED (Public)

### Payment

- POST `/payments` -> IMPLEMENTED (requires valid ticketProductId)
- GET `/payments/:paymentId` -> IMPLEMENTED

### Event

- `/events/*` -> EMPTY (no routes)
