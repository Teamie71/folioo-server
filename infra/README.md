# Folioo Infrastructure (Terraform)

This directory is the Terraform skeleton for Folioo's GCP migration.

## Scope

- Included: Terraform foundation, provider setup, backend contract, module contracts.
- Implemented: WIF (Workload Identity Federation), Artifact Registry, CI identity.
- Deferred: concrete networking/compute/cloudflare implementation.
- Excluded:
    - Cloud SQL: Folioo uses Supabase as fixed external DB.
    - GCS storage module: not required by current Folioo server architecture.

## Layout

```
infra/
  versions.tf
  providers.tf
  backend.tf
  variables.tf
  main.tf
  outputs.tf
  wif.tf              # WIF pool/provider + GitHub Actions SA + IAM bindings
  artifact-registry.tf # Docker image repository
  environments/
    dev.tfvars.example
    prod.tfvars.example
  modules/
    networking/
    compute/
    cloudflare/
  docs/
    backend-bootstrap.md  # One-time bootstrap procedure
    env-contract.md       # Environment/secret contract
```

## Required Inputs

- GCP: `project_id`, `region`, `zone`
- GitHub OIDC/WIF: `github_repository` (e.g., `Teamie71/folioo-server`)
- Cloudflare (when enabled): `cloudflare_api_token`, `cloudflare_account_id`, `cloudflare_zone_id`

## Security Rules

- **No static SA keys**: All CI auth uses WIF (OIDC token exchange).
- **tfvars in GCS, not git**: Real variable values live in a GCS bucket.
- Do not commit real `*.tfvars` files.
- Do not commit API tokens or credentials.
- Keep real values in GitHub Secrets and GCP Secret Manager.

## Validation Commands

```bash
terraform -chdir=infra init -backend=false
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
```

## Bootstrap

First-time setup requires a manual bootstrap sequence.
See [docs/backend-bootstrap.md](docs/backend-bootstrap.md) for the full procedure.

## CI Workflow

`.github/workflows/terraform.yml` runs on `infra/**` changes:

- **PR**: `terraform plan` with PR comment
- **Push to dev**: `terraform apply` (auto-approve)

Required GitHub Secrets: `GCP_PROJECT_ID`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `TF_STATE_BUCKET`.

## Key Outputs

| Output                    | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `wif_provider`            | WIF provider resource name (GitHub secret) |
| `github_actions_sa_email` | SA email for CI (GitHub secret)            |
| `artifact_registry_url`   | Docker image URL prefix                    |
