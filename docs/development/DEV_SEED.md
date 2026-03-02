# Dev Seed

This project does not use database migrations yet.
In `local`/`dev` profiles, TypeORM runs with `synchronize: true` (see `src/config/typeorm-config.ts`).

To avoid empty dev databases blocking manual tests and smoke tests, we seed minimal reference data on app startup.

## Safety guard

All seed logic is gated by `APP_PROFILE`:

| APP_PROFILE | Seed runs? |
| ----------- | ---------- |
| `local`     | Yes        |
| `dev`       | Yes        |
| `prod`      | **No**     |
| (unset)     | **No**     |

If the profile is not `local` or `dev`, the seed service returns immediately without any DB access.

## ticket_product

Seed service:

- `src/modules/ticket/application/services/ticket-product-seed.service.ts`

Lifecycle:

- Implements `OnModuleInit` — runs automatically on every server start
- No manual invocation required

Idempotent logic:

- Match key: `(type, quantity)`
- Row missing → INSERT
- Row exists but fields differ (price, originalPrice, displayOrder, isActive) → UPDATE
- Row exists and matches → SKIP (no write)
- Seed failure is caught and logged as `error`; it never prevents server startup

Seed values (6 products):

| type                 | quantity | price | originalPrice | displayOrder |
| -------------------- | -------- | ----- | ------------- | ------------ |
| EXPERIENCE           | 1        | 990   | null          | 1            |
| EXPERIENCE           | 3        | 2700  | 2970          | 2            |
| EXPERIENCE           | 5        | 4100  | 4950          | 3            |
| PORTFOLIO_CORRECTION | 1        | 990   | null          | 4            |
| PORTFOLIO_CORRECTION | 3        | 2700  | 2970          | 5            |
| PORTFOLIO_CORRECTION | 5        | 4100  | 4950          | 6            |

## Verifying seed data

### 1. Server logs

On startup the seed service emits one of these log lines (class: `TicketProductSeedService`):

```
[seed] ticket_product OK — 6종 모두 최신 (변경 없음)
[seed] ticket_product 완료 — 생성 N, 갱신 M, 스킵 K (전체 6종)
[seed] ticket_product seed 실패 — <error message>
```

### 2. Public API

`GET /ticket-products` is a public endpoint (no auth required):

```bash
# Local
curl -s http://localhost:3000/ticket-products | jq '.result | length'
# Expected: 6

# Dev server
curl -s https://folioo-dev-api.log8.kr/ticket-products | jq '.result | length'
# Expected: 6
```

### 3. Smoke test preflight

`scripts/smoke-dev-api.mjs` performs a preflight `GET /ticket-products` to discover `ticketProductId`.
If the seed ran correctly, preflight succeeds and subsequent `POST /payments` uses a real product ID.

## After a DB reset

If the dev database is wiped (see `docs/development/DEV_DB_RESET.md`), simply restart the server.
TypeORM `synchronize: true` recreates tables, and the seed service re-inserts all 6 products on the next startup.

```bash
# 1. Reset DB (deletes all data)
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d --force-recreate --wait

# 2. Server restart triggers seed automatically
# 3. Verify
curl -s https://folioo-dev-api.log8.kr/ticket-products | jq '.result | length'
```
