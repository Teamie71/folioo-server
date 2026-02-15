# Dev DB Reset

When changing DB naming policy (snake_case) or TypeORM schema options, the dev DB may become inconsistent.
In `dev`/`local` profiles, this project runs TypeORM with `synchronize: true`, so resetting the DB is the fastest way to recover.

## Lightsail (dev server)

```bash
cd ~/docker

# WARNING: This deletes ALL dev DB data
docker compose --env-file .env.dev -f docker-compose.dev.yml down -v

docker compose --env-file .env.dev -f docker-compose.dev.yml up -d --force-recreate --wait

docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f --tail=200
```

## Local

If you run Postgres via Docker locally, use the same `down -v` approach.
