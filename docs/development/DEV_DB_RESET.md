# Dev DB Reset

When changing DB naming policy (snake_case) or TypeORM schema options, the dev DB may become inconsistent.
In `dev`/`local` profiles, this project runs TypeORM with `synchronize: true`, so resetting the DB is the fastest way to recover.

## Dev/Prod 서버

Dev/Prod 환경에서는 Supabase를 사용합니다.
DB 리셋이 필요한 경우 Supabase 대시보드에서 직접 수행하거나 `supabase db reset` CLI를 사용하세요.

## Local

로컬에서 Docker로 PostgreSQL을 실행하는 경우 `down -v`로 볼륨을 삭제하고 재생성합니다.

```bash
docker compose down -v
docker compose up -d --force-recreate --wait
```
