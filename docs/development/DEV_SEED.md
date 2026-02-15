# Dev Seed

This project does not use database migrations yet.
In `local`/`dev` profiles, TypeORM runs with `synchronize: true` (see `src/config/typeorm-config.ts`).

To avoid empty dev databases blocking manual tests and smoke tests, we seed minimal reference data on app startup.

## ticket_product (dev/local)

Seed service:

- `src/modules/ticket/application/services/ticket-product-seed.service.ts`

Behavior:

- Runs only when `APP_PROFILE` is `local` or `dev`
- Ensures the following 6 products exist (match by `(type, quantity)`) and updates fields if mismatched

Seed values:

| type                 | quantity | price | originalPrice | displayOrder |
| -------------------- | -------- | ----- | ------------- | ------------ |
| EXPERIENCE           | 1        | 990   | null          | 1            |
| EXPERIENCE           | 3        | 2700  | 2970          | 2            |
| EXPERIENCE           | 5        | 4100  | 4950          | 3            |
| PORTFOLIO_CORRECTION | 1        | 990   | null          | 4            |
| PORTFOLIO_CORRECTION | 3        | 2700  | 2970          | 5            |
| PORTFOLIO_CORRECTION | 5        | 4100  | 4950          | 6            |
