# Terraform Backend Bootstrap

This document describes the one-time bootstrap procedure for Folioo's Terraform backend
and CI identity (WIF + Artifact Registry).

## Overview

Terraform state is stored in a GCS bucket. Since the bucket must exist **before**
`terraform init`, and WIF must exist **before** GitHub Actions can authenticate,
a manual bootstrap sequence is required.

## Bootstrap Sequence

```
┌─────────────────────────────────────┐
│ 1. gcloud auth (operator login)     │
│ 2. Create GCS bucket (TF state)     │
│ 3. Upload terraform.tfvars to GCS   │
│ 4. terraform init + apply (local)   │
│    → creates WIF, AR, SA            │
│ 5. Extract outputs → GitHub Secrets │
│ 6. CI now uses WIF (no more keys)   │
└─────────────────────────────────────┘
```

## Step-by-Step

### 1. Authenticate as operator

```bash
gcloud auth login
gcloud config set project folioo-ai
gcloud auth application-default login
```

### 2. Create GCS bucket for Terraform state

```bash
# Bucket name must be globally unique
export TF_STATE_BUCKET="folioo-ai-tfstate"

gcloud storage buckets create "gs://${TF_STATE_BUCKET}" \
  --project=folioo-ai \
  --location=asia-northeast3 \
  --uniform-bucket-level-access \
  --public-access-prevention

# Enable versioning for state recovery
gcloud storage buckets update "gs://${TF_STATE_BUCKET}" \
  --versioning
```

### 3. Create and upload terraform.tfvars

```bash
cat > /tmp/terraform.tfvars <<'EOF'
project_id = "folioo-ai"
region     = "asia-northeast3"
zone       = "asia-northeast3-a"

github_repository = "Teamie71/folioo-server"

# Cloudflare values (fill when ready, leave empty to skip)
enable_cloudflare     = false
cloudflare_api_token  = ""
cloudflare_account_id = ""
cloudflare_zone_id    = ""
EOF

gcloud storage cp /tmp/terraform.tfvars "gs://${TF_STATE_BUCKET}/terraform.tfvars"
rm /tmp/terraform.tfvars
```

### 4. Enable required GCP APIs

```bash
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  --project=folioo-ai
```

### 5. Local Terraform apply

```bash
cd infra

# Download tfvars
gcloud storage cp "gs://${TF_STATE_BUCKET}/terraform.tfvars" terraform.tfvars

# Init with backend bucket
terraform init -backend-config="bucket=${TF_STATE_BUCKET}"

# Plan and review
terraform plan -var-file=terraform.tfvars

# Apply (creates WIF pool, provider, SA, AR repo)
terraform apply -var-file=terraform.tfvars

# Clean up local tfvars (contains sensitive values)
rm terraform.tfvars
```

### 6. Extract outputs and set GitHub Secrets

After apply, extract the values needed for CI:

```bash
# WIF provider resource name (full path)
terraform output -raw wif_provider
# → projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/folioo-pool/providers/github-provider

# Service account email
terraform output -raw github_actions_sa_email
# → github-actions@folioo-ai.iam.gserviceaccount.com

# Artifact Registry URL prefix
terraform output -raw artifact_registry_url
# → asia-northeast3-docker.pkg.dev/folioo-ai/folioo-docker
```

Set these as GitHub repository secrets:

| GitHub Secret         | Value Source                               |
| --------------------- | ------------------------------------------ |
| `GCP_PROJECT_ID`      | `folioo-ai`                                |
| `WIF_PROVIDER`        | `terraform output wif_provider`            |
| `WIF_SERVICE_ACCOUNT` | `terraform output github_actions_sa_email` |
| `TF_STATE_BUCKET`     | `folioo-ai-tfstate`                        |

```bash
# Using GitHub CLI
gh secret set GCP_PROJECT_ID --body "folioo-ai"
gh secret set WIF_PROVIDER --body "$(terraform output -raw wif_provider)"
gh secret set WIF_SERVICE_ACCOUNT --body "$(terraform output -raw github_actions_sa_email)"
gh secret set TF_STATE_BUCKET --body "${TF_STATE_BUCKET}"
```

## Post-Bootstrap Verification

```bash
# Verify WIF pool exists
gcloud iam workload-identity-pools list \
  --project=folioo-ai --location=global \
  --format="value(name)"

# Verify AR repo exists
gcloud artifacts repositories list \
  --project=folioo-ai --location=asia-northeast3

# Verify SA exists
gcloud iam service-accounts list \
  --project=folioo-ai \
  --filter="email:github-actions@"
```

## Security Notes

- **No static SA keys**: All CI auth uses WIF (OIDC token exchange).
- **Repository-bound**: WIF attribute_condition restricts to `Teamie71/folioo-server` only.
- **tfvars in GCS, not git**: Real variable values live in the GCS bucket, never committed.
- **State bucket versioning**: Enabled for recovery from corrupted state.
- **prevent_destroy**: AR repository has lifecycle protection against accidental deletion.

## Troubleshooting

### "Backend initialization required"

```bash
terraform init -backend-config="bucket=${TF_STATE_BUCKET}"
```

### "Permission denied" on first apply

Ensure you have `roles/owner` or sufficient IAM roles on the project:

```bash
gcloud projects get-iam-policy folioo-ai \
  --flatten="bindings[].members" \
  --filter="bindings.members:$(gcloud config get-value account)"
```

### WIF auth fails in GitHub Actions

1. Verify `id-token: write` permission is set in workflow.
2. Verify `WIF_PROVIDER` secret matches full provider resource name.
3. Verify repository name matches `attribute_condition` exactly.
