## Environment Management

This project manages runtime env values with GCP Secret Manager.

### Source of Truth

- `folioo-dev-config`
- `folioo-prod-config`

### GitHub Secrets (minimum set)

- `GCP_PROJECT_ID`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `TF_STATE_BUCKET`

Legacy secrets (`ENV_DEV`, `ENV_PROD`, `LIGHTSAIL_*`, `DOCKERHUB_*`, `DOCKER_IMAGE`) are removed.

### How CI/CD loads env

- `deploy-dev.yml`: reads `folioo-dev-config` and writes `/home/folioo/.env.dev` on dev GCE
- `deploy.yml`: reads `folioo-prod-config` and writes `/home/folioo/.env.prod` on prod GCE

### Local sync (safe from commit)

```bash
gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-dev-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.dev

gcloud secrets versions access latest --project="${GCP_PROJECT_ID}" --secret="folioo-prod-config" \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > .env.prod
```

Output files are ignored by `.gitignore`.

### Profile policy

- `local`: Docker Postgres + Docker Redis (`CACHE_DRIVER=ioredis`)
- `dev`: Upstash Redis (`CACHE_DRIVER=upstash`) + `SUPABASE_DB_URL` (required)
- `prod`: Upstash Redis (`CACHE_DRIVER=upstash`) + `SUPABASE_DB_URL` (required)
