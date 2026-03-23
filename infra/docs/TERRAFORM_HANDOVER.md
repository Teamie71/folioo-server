# Folioo Terraform 인수인계 가이드

> 이 문서는 Folioo 인프라를 처음 접하는 팀원이 Terraform 기반 GCP 인프라를 이해하고 운영할 수 있도록 작성된 인수인계 가이드입니다.

---

## 목차

1. [전체 아키텍처 요약](#1-전체-아키텍처-요약)
2. [디렉토리 구조](#2-디렉토리-구조)
3. [사전 준비 (Prerequisites)](#3-사전-준비-prerequisites)
4. [Terraform 기본 명령어](#4-terraform-기본-명령어)
5. [모듈별 상세 설명](#5-모듈별-상세-설명)
6. [CI/CD 파이프라인](#6-cicd-파이프라인)
7. [Blue-Green 배포 구조](#7-blue-green-배포-구조)
8. [시크릿 및 환경변수 관리](#8-시크릿-및-환경변수-관리)
9. [일상 운영 시나리오](#9-일상-운영-시나리오)
10. [트러블슈팅](#10-트러블슈팅)
11. [주의사항 및 금지 행위](#11-주의사항-및-금지-행위)
12. [관련 문서 링크](#12-관련-문서-링크)

---

## 1. 전체 아키텍처 요약

```
                     ┌──────────────────────────────────────────────────┐
                     │                  Cloudflare                      │
                     │  dev-api.folioo.ai.kr ──► Tunnel ──► Traefik    │
                     │  prod-api.folioo.ai.kr ──► Tunnel ──► Traefik   │
                     │  + Zero Trust Access (이메일 도메인 제한)         │
                     └──────────────────────────────────────────────────┘
                                          │
                     ┌────────────────────────────────────────────┐
                     │              GCP (folioo-488916)            │
                     │                                            │
                     │  VPC: folioo-vpc (10.30.0.0/24)            │
                     │  ├─ folioo-dev-server  (10.30.0.10)        │
                     │  │   └─ Docker: Traefik + cloudflared      │
                     │  │              + App (Blue/Green)          │
                     │  ├─ folioo-prod-server (10.30.0.11)        │
                     │  │   └─ Docker: Traefik + cloudflared      │
                     │  │              + App (Blue/Green)          │
                     │  │                                         │
                     │  ├─ Cloud NAT (고정 Egress IP)              │
                     │  ├─ Artifact Registry (Docker 이미지)       │
                     │  ├─ Secret Manager (환경변수)                │
                     │  └─ WIF (GitHub Actions OIDC 인증)          │
                     └────────────────────────────────────────────┘
                                          │
                     ┌────────────────────────────────────────────┐
                     │            외부 서비스 (Terraform 외)        │
                     │  ├─ Supabase: PostgreSQL (dev/prod)        │
                     │  └─ Upstash: Redis REST API (dev/prod)     │
                     └────────────────────────────────────────────┘
```

### 핵심 설계 원칙

- **Public IP 없음**: VM에 외부 IP를 부여하지 않음. 모든 외부 트래픽은 Cloudflare Tunnel을 통해 유입
- **정적 SA 키 없음**: CI/CD 인증은 Workload Identity Federation(OIDC)으로만 처리
- **IAP 터널 SSH**: VM 접속은 반드시 IAP(Identity-Aware Proxy) 터널을 통해
- **Blue-Green 배포**: 무중단 배포를 위해 Traefik + Docker Compose 프로필 기반

### Terraform이 관리하는 것 / 관리하지 않는 것

| 관리함 (IaC)                | 관리 안 함 (수동 또는 외부)          |
| --------------------------- | ------------------------------------ |
| VPC, Subnet, Firewall       | Supabase DB (외부 SaaS)              |
| GCE VM (dev/prod)           | Upstash Redis (외부 SaaS)            |
| Cloud NAT, Cloud Router     | Docker Compose 파일 (git 관리)       |
| Artifact Registry           | GCP Secret Manager의 시크릿 _값_     |
| WIF Pool/Provider           | GitHub Repository Secrets의 _값_     |
| Service Accounts + IAM      | Supabase 마이그레이션 (supabase CLI) |
| Cloudflare Tunnel, DNS, ZTA | 앱 코드 및 Dockerfile                |

---

## 2. 디렉토리 구조

```
infra/
├── main.tf                 # 루트 모듈 — 3개 하위 모듈 조합
├── backend.tf              # Terraform state 저장소 (GCS)
├── versions.tf             # Terraform/Provider 버전 제약
├── providers.tf            # Google + Cloudflare provider 설정
├── variables.tf            # 루트 변수 정의 (입력값)
├── outputs.tf              # Terraform 출력값 (CI에서 활용)
├── wif.tf                  # Workload Identity Federation + SA + IAM
├── artifact-registry.tf    # Docker 이미지 저장소
├── environments/
│   ├── dev.tfvars.example  # Dev 변수 예시 (실제 값은 GCS에)
│   └── prod.tfvars.example # Prod 변수 예시
├── modules/
│   ├── networking/         # VPC, Subnet, Firewall, NAT
│   ├── compute/            # GCE VM (dev + prod)
│   └── cloudflare/         # Tunnel, DNS, Zero Trust Access
├── docs/
│   ├── backend-bootstrap.md    # 최초 부트스트랩 절차
│   ├── env-contract.md         # 환경변수 계약서
│   └── TERRAFORM_HANDOVER.md   # 이 문서
└── .server.info            # 서버 접속 정보 (gitignore 대상)
```

---

## 3. 사전 준비 (Prerequisites)

### 3.1 필수 도구 설치

```bash
# Terraform (>= 1.5.0)
brew install terraform  # macOS
# 또는 https://developer.hashicorp.com/terraform/install

# Google Cloud SDK
brew install google-cloud-sdk  # macOS
# 또는 https://cloud.google.com/sdk/docs/install

# GitHub CLI (선택, Secrets 관리용)
brew install gh
```

### 3.2 GCP 프로젝트 접근 권한

다음 역할(Role)이 필요합니다:

| 역할                               | 용도                           |
| ---------------------------------- | ------------------------------ |
| `roles/editor` 또는 `roles/owner`  | Terraform apply (로컬 실행 시) |
| `roles/iap.tunnelResourceAccessor` | VM SSH 접속 (IAP)              |
| `roles/secretmanager.admin`        | Secret Manager 시크릿 편집     |

```bash
# GCP 로그인 및 프로젝트 설정
gcloud auth login
gcloud config set project folioo-488916
gcloud auth application-default login
```

### 3.3 Terraform 초기화

```bash
cd infra

# GCS에서 tfvars 다운로드
export TF_STATE_BUCKET="folioo-488916-tfstate"
gcloud storage cp "gs://${TF_STATE_BUCKET}/terraform.tfvars" terraform.tfvars

# 초기화 (state backend 연결)
terraform init -backend-config="bucket=${TF_STATE_BUCKET}"

# 작업 후 반드시 tfvars 삭제 (민감 정보)
rm terraform.tfvars
```

---

## 4. Terraform 기본 명령어

### 일상적으로 사용하는 명령어

```bash
# 포맷 검사
terraform fmt -check -recursive

# 문법 검증 (backend 연결 없이)
terraform init -backend=false
terraform validate

# 변경 계획 미리 보기
terraform plan -var-file=terraform.tfvars

# 변경 적용
terraform apply -var-file=terraform.tfvars

# 특정 리소스만 적용 (주의해서 사용)
terraform apply -var-file=terraform.tfvars -target=module.compute

# 출력값 확인
terraform output
terraform output -raw wif_provider
terraform output -json deploy_config
```

### 절대 하면 안 되는 명령어

```bash
# !! 이 명령어들은 실행하지 마세요 !!
terraform destroy                          # 전체 인프라 삭제
terraform state rm <resource>              # state에서 리소스 제거
terraform import <resource> <id>           # 신중하게, 반드시 plan 먼저
terraform force-unlock <lock-id>           # 다른 사람이 작업 중일 수 있음
```

---

## 5. 모듈별 상세 설명

### 5.1 Networking (`modules/networking/`)

VPC 네트워크 및 보안 경계를 정의합니다.

| 리소스                   | 이름                                | 설명                                     |
| ------------------------ | ----------------------------------- | ---------------------------------------- |
| VPC                      | `folioo-vpc`                        | 커스텀 모드 VPC (auto_create=false)      |
| Subnet                   | `folioo-private-app-subnet`         | `10.30.0.0/24`, Private Google Access ON |
| Firewall (앱 내부)       | `folioo-allow-app-ingress-internal` | 서브넷 내 TCP 3000 허용                  |
| Firewall (VPC 내부 전체) | `folioo-allow-internal-vpc`         | 서브넷 내 모든 프로토콜 허용             |
| Firewall (IAP SSH)       | `folioo-allow-ssh-from-iap`         | `35.235.240.0/20` → TCP 22 허용          |
| Cloud NAT                | `folioo-nat`                        | VM의 아웃바운드 인터넷 접근              |
| Static IP                | `folioo-nat-ip`                     | NAT용 고정 Egress IP                     |

**고정 Egress IP가 중요한 이유**: Supabase, Upstash 등 외부 서비스에서 IP 화이트리스트를 설정할 때 이 IP를 사용합니다.

```bash
# 현재 NAT IP 확인
terraform output nat_static_egress_ip
```

### 5.2 Compute (`modules/compute/`)

Dev/Prod 두 대의 GCE VM을 `for_each`로 생성합니다.

| 속성         | Dev                          | Prod                         |
| ------------ | ---------------------------- | ---------------------------- |
| VM 이름      | `folioo-dev-server`          | `folioo-prod-server`         |
| Internal IP  | `10.30.0.10`                 | `10.30.0.11`                 |
| Machine Type | `e2-medium` (2 vCPU, 4GB)    | `e2-medium`                  |
| Disk         | 30GB pd-balanced             | 30GB pd-balanced             |
| OS           | Ubuntu 22.04 LTS             | Ubuntu 22.04 LTS             |
| 삭제 보호    | `deletion_protection = true` | `deletion_protection = true` |

**VM Runtime SA** (`folioo-vm-runtime-sa`):

- `roles/logging.logWriter` — 로그 전송
- `roles/monitoring.metricWriter` — 모니터링 메트릭 전송
- `roles/secretmanager.secretAccessor` — 시크릿 읽기
- `roles/artifactregistry.reader` — Docker 이미지 Pull

**Startup Script**: VM 최초 부팅 시 Docker CE를 설치하고 `/opt/folioo/runtime.env`에 기본 환경 파일을 생성합니다. `lifecycle { ignore_changes = [metadata_startup_script] }`로 이후 변경이 무시됩니다.

### 5.3 Cloudflare (`modules/cloudflare/`)

`enable_cloudflare = true`일 때만 생성됩니다 (`count` 기반).

구성 요소:

- **Tunnel (dev/prod)**: `cloudflared`가 VM에서 Cloudflare Edge로 아웃바운드 연결
- **DNS CNAME**: `dev-api.folioo.ai.kr` / `prod-api.folioo.ai.kr` → `<tunnel-id>.cfargotunnel.com`
- **Zero Trust Access** (선택): `allowed_email_domains`가 설정된 경우에만 생성. 특정 이메일 도메인의 사용자만 접근 허용

Tunnel Token은 `terraform output`으로 확인 가능하며, GCE VM의 `cloudflared` 컨테이너 환경변수 `TUNNEL_TOKEN`에 주입됩니다.

### 5.4 WIF (Workload Identity Federation) — `wif.tf`

GitHub Actions가 GCP에 **정적 키 없이** 인증할 수 있도록 합니다.

```
GitHub Actions → OIDC Token → WIF Pool (folioo-pool) → Provider (github-provider)
     → Service Account (github-actions@folioo-488916.iam.gserviceaccount.com)
```

**attribute_condition**: `assertion.repository == 'Teamie71/folioo-server'`로 특정 리포지토리에서만 인증 가능합니다.

**GitHub Actions SA의 IAM 역할들**:

| 역할                                    | 용도                       |
| --------------------------------------- | -------------------------- |
| `roles/artifactregistry.writer`         | Docker 이미지 Push         |
| `roles/storage.objectAdmin`             | TF state/deploy-config R/W |
| `roles/secretmanager.secretAccessor`    | 시크릿 읽기 (CD)           |
| `roles/compute.instanceAdmin.v1`        | GCE SSH/SCP (배포)         |
| `roles/iap.tunnelResourceAccessor`      | IAP 터널 접근              |
| `roles/iam.serviceAccountAdmin`         | SA 관리 (TF apply)         |
| `roles/iam.workloadIdentityPoolAdmin`   | WIF 관리 (TF apply)        |
| `roles/resourcemanager.projectIamAdmin` | IAM 바인딩 관리 (TF apply) |

### 5.5 Artifact Registry — `artifact-registry.tf`

```
asia-northeast3-docker.pkg.dev/folioo-488916/folioo-docker/folioo-server
```

- `prevent_destroy = true` — 실수로 삭제 방지 (lifecycle)
- 이미지 태그: `dev` (dev 배포), `latest` (prod 배포), `<commit-sha>` (롤백용)

---

## 6. CI/CD 파이프라인

### 6.1 워크플로우 전체 흐름

```
                    infra/** 변경
                         │
        ┌────────────────┴────────────────┐
        │                                  │
   PR 생성 시                         dev 브랜치 push 시
        │                                  │
   terraform.yml                      terraform.yml
   ├─ fmt -check                      ├─ fmt -check
   ├─ init -backend=false             ├─ init (GCS backend)
   ├─ validate                        ├─ validate
   └─ PR 코멘트 (결과)                ├─ plan
                                      ├─ apply -auto-approve
                                      └─ deploy-config.json → GCS 업로드
```

```
   dev 브랜치 push (앱 코드)          main 브랜치 push (앱 코드)
        │                                  │
   deploy-dev.yml                     deploy.yml
   ├─ Docker Build + Push (:dev)      ├─ Docker Build + Push (:latest)
   ├─ Supabase migration              ├─ Supabase migration
   ├─ GCS에서 deploy-config.json 로드 ├─ GCS에서 deploy-config.json 로드
   ├─ Secret Manager → .env 생성      ├─ Secret Manager → .env 생성
   ├─ Compose 파일 SCP 전송           ├─ Compose 파일 SCP 전송
   └─ Blue-Green 배포 실행            └─ Blue-Green 배포 실행
```

### 6.2 GitHub Repository Secrets

| Secret                 | 값                                                                                                   | 사용처                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ |
| `GCP_PROJECT_ID`       | `folioo-488916`                                                                                      | 모든 워크플로우          |
| `TF_STATE_BUCKET`      | `folioo-488916-tfstate`                                                                              | terraform.yml, deploy-\* |
| `WIF_PROVIDER`         | `projects/798390960348/locations/global/workloadIdentityPools/folioo-pool/providers/github-provider` | 모든 워크플로우          |
| `WIF_SERVICE_ACCOUNT`  | `github-actions@folioo-488916.iam.gserviceaccount.com`                                               | 모든 워크플로우          |
| `SUPABASE_DEV_DB_URL`  | Supabase dev DB 연결 문자열 (port 5432)                                                              | deploy-dev.yml           |
| `SUPABASE_PROD_DB_URL` | Supabase prod DB 연결 문자열 (port 5432)                                                             | deploy.yml               |

> **주의**: `SUPABASE_*_DB_URL`은 반드시 direct connection (port `5432`)을 사용해야 합니다. Transaction pooler port `6543`을 사용하면 마이그레이션이 실패합니다.

### 6.3 terraform.tfvars 관리

실제 Terraform 변수 파일은 **GCS 버킷**에 저장됩니다:

```bash
# 확인
gcloud storage cat gs://folioo-488916-tfstate/terraform.tfvars

# 수정이 필요한 경우
gcloud storage cp gs://folioo-488916-tfstate/terraform.tfvars /tmp/terraform.tfvars
# 편집 후
gcloud storage cp /tmp/terraform.tfvars gs://folioo-488916-tfstate/terraform.tfvars
rm /tmp/terraform.tfvars
```

---

## 7. Blue-Green 배포 구조

### 7.1 Docker Compose 파일 구성

```
docker-compose.infra.yml     # 공통 인프라 (Traefik + cloudflared)
docker-compose.dev.yml       # Dev 오버레이 (dev-blue / dev-green)
docker-compose.prod.yml      # Prod 오버레이 (prod-blue / prod-green)
```

### 7.2 배포 흐름

```
1. 현재 활성 슬롯 감지 (예: dev-blue)
2. 반대편 슬롯 기동 (예: dev-green)
3. Health Check (최대 180초, 5초 간격)
   - healthy → 4번으로
   - unhealthy/timeout → 롤백 (새 슬롯 삭제)
4. 구 슬롯 종료 (dev-blue 중지 및 제거)
5. 인프라 컨테이너(Traefik, cloudflared)는 유지
```

### 7.3 VM 내부 파일 경로

```
/home/folioo/
├── .env.dev                    # Dev 환경변수
├── .env.prod                   # Prod 환경변수
├── docker-compose.infra.yml    # 인프라 베이스
├── docker-compose.dev.yml      # Dev 오버레이
└── docker-compose.prod.yml     # Prod 오버레이
```

### 7.4 Traefik 라우팅

Traefik은 Docker label 기반으로 라우팅합니다:

- `Host(dev-api.folioo.ai.kr)` → 활성 dev 슬롯의 port 3000
- `Host(prod-api.folioo.ai.kr)` → 활성 prod 슬롯의 port 3000

Blue/Green 두 슬롯이 **동일한 Traefik 라우터 이름**을 사용하므로, 한 쪽만 실행 중이어야 합니다.

---

## 8. 시크릿 및 환경변수 관리

### 8.1 GCP Secret Manager

앱 런타임 환경변수는 Secret Manager에 JSON으로 저장됩니다:

- `folioo-dev-config` — Dev 환경
- `folioo-prod-config` — Prod 환경

```bash
# 현재 시크릿 내용 확인
gcloud secrets versions access latest \
  --project=folioo-488916 \
  --secret=folioo-dev-config | jq .

# 새 버전 업로드 (기존 버전은 자동 비활성화)
echo '{"KEY":"value", ...}' | \
  gcloud secrets versions add folioo-dev-config \
  --project=folioo-488916 \
  --data-file=-
```

### 8.2 시크릿 변경 후 반영

Secret Manager의 값을 변경한 후, 실행 중인 앱에 반영하려면:

**방법 1: CD 워크플로우 재실행** (권장)

```
GitHub Actions > 해당 워크플로우 > Re-run all jobs
```

워크플로우가 Secret Manager에서 최신 값을 가져와 `.env` 파일을 재생성하고 배포합니다.

**방법 2: 수동 반영**

```bash
# 1. Secret Manager에서 JSON 가져오기
gcloud secrets versions access latest \
  --project=folioo-488916 \
  --secret=folioo-dev-config \
  | jq -r 'to_entries[] | "\(.key)=\(.value)"' > /tmp/.env.dev

# 2. VM에 전송
gcloud compute scp /tmp/.env.dev folioo-dev-server:~/.env.dev \
  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap --quiet

# 3. VM에서 파일 이동 및 권한 설정
gcloud compute ssh folioo-dev-server \
  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap --quiet \
  --command='sudo mv ~/.env.dev /home/folioo/.env.dev && sudo chmod 600 /home/folioo/.env.dev'

# 4. 앱 컨테이너 재시작
gcloud compute ssh folioo-dev-server \
  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap --quiet \
  --command='
    cd /home/folioo
    DC="sudo -E docker compose --env-file .env.dev -f docker-compose.infra.yml -f docker-compose.dev.yml"
    ACTIVE=$(eval $DC ps --format json 2>/dev/null | jq -sr ".[].Service" | grep -E "dev-blue|dev-green" | head -1)
    PROFILE=$(echo $ACTIVE | sed "s/dev-//")
    eval $DC --profile $PROFILE up -d --force-recreate
  '

# 5. 로컬 파일 삭제
rm /tmp/.env.dev
```

### 8.3 필수 환경변수 목록

자세한 내용은 [`env-contract.md`](./env-contract.md)를 참고하세요.

핵심 키:

| 키                     | 설명                 | Dev/Prod 필수 |
| ---------------------- | -------------------- | ------------- |
| `APP_PROFILE`          | `dev` 또는 `prod`    | O             |
| `SUPABASE_DB_URL`      | DB 연결 문자열       | O             |
| `CACHE_DRIVER`         | `upstash`            | O             |
| `UPSTASH_REDIS_*`      | Redis REST URL/Token | O             |
| `JWT_SECRET_TOKEN`     | JWT Access 시크릿    | O             |
| `JWT_REFRESH_TOKEN`    | JWT Refresh 시크릿   | O             |
| `KAKAO_*`              | 카카오 OAuth         | O             |
| `GOOGLE_*`             | 구글 OAuth           | O             |
| `NAVER_*`              | 네이버 OAuth         | O             |
| `AI_BASE_URL`          | AI 서버 주소         | O             |
| `AI_SERVICE_API_KEY`   | AI 서버 API 키       | O             |
| `MAIN_BACKEND_API_KEY` | Internal API 키      | O             |

---

## 9. 일상 운영 시나리오

### 9.1 VM에 SSH 접속하기

```bash
# Dev VM
gcloud compute ssh folioo-dev-server \
  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap

# Prod VM
gcloud compute ssh folioo-prod-server \
  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap
```

### 9.2 컨테이너 상태 확인

```bash
# VM에 접속한 상태에서
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

# 앱 로그 확인
sudo docker logs -f folioo-dev-blue-1    # 또는 folioo-dev-green-1

# 헬스체크 상태
sudo docker inspect --format='{{.State.Health.Status}}' folioo-dev-blue-1

# 외부에서 헬스체크
curl -sf https://dev-api.folioo.ai.kr/health
curl -sf https://prod-api.folioo.ai.kr/health
```

### 9.3 Terraform 변수 변경 (예: VM 스펙 변경)

```bash
# 1. GCS에서 tfvars 다운로드
gcloud storage cp gs://folioo-488916-tfstate/terraform.tfvars /tmp/terraform.tfvars

# 2. 편집 (예: machine_type 변경)
vi /tmp/terraform.tfvars

# 3. GCS에 업로드
gcloud storage cp /tmp/terraform.tfvars gs://folioo-488916-tfstate/terraform.tfvars
rm /tmp/terraform.tfvars

# 4. infra/ 디렉토리의 .tf 파일을 변경하고 PR을 생성하거나,
#    변수만 변경한 경우 GitHub Actions > terraform.yml > Run workflow (수동 실행)
```

### 9.4 Cloudflare Tunnel 토큰 갱신

Tunnel 토큰은 Terraform이 관리합니다. 갱신이 필요하면:

```bash
# 현재 토큰 확인
terraform output -raw dev_tunnel_token
terraform output -raw prod_tunnel_token

# VM의 cloudflared 컨테이너에 새 토큰 적용
# → docker-compose 파일의 TUNNEL_TOKEN 환경변수를 .env 파일에 추가하거나
#   CD 워크플로우를 재실행
```

### 9.5 새 환경변수 추가

1. `env-contract.md`에 키 문서화
2. Secret Manager에 JSON 업데이트:

    ```bash
    # 현재 값 가져오기
    gcloud secrets versions access latest --secret=folioo-dev-config --project=folioo-488916 > /tmp/config.json

    # 키 추가 (jq 사용)
    jq '. + {"NEW_KEY": "new-value"}' /tmp/config.json | \
      gcloud secrets versions add folioo-dev-config --project=folioo-488916 --data-file=-

    rm /tmp/config.json
    ```

3. CD 워크플로우 재실행하여 반영

### 9.6 Supabase 마이그레이션 실패 시

CD 워크플로우에서 `supabase db push` 단계가 실패하면:

1. 워크플로우 로그에서 실패 원인 확인
2. 로컬에서 마이그레이션 수정 후 다시 push
3. 혹은 수동으로 실행:
    ```bash
    # Supabase CLI 설치 필요
    supabase db push --db-url "postgresql://user:pass@host:5432/postgres"
    ```

> **주의**: port `6543`(Transaction Pooler)은 마이그레이션에 사용할 수 없습니다.

---

## 10. 트러블슈팅

### 10.1 "Backend initialization required"

```bash
terraform init -backend-config="bucket=folioo-488916-tfstate"
```

### 10.2 "Error acquiring the state lock"

다른 사람이 `terraform apply` 중일 수 있습니다. 확인 후:

```bash
# 확인
terraform force-unlock <LOCK_ID>
# !! 반드시 다른 사람이 작업 중이 아닌지 확인 후 실행
```

### 10.3 GitHub Actions WIF 인증 실패

1. `id-token: write` 퍼미션이 워크플로우에 있는지 확인
2. `WIF_PROVIDER` Secret 값이 full resource name인지 확인
3. 리포지토리 이름이 `attribute_condition`과 일치하는지 확인:
    ```bash
    # 현재 설정 확인
    gcloud iam workload-identity-pools providers describe github-provider \
      --workload-identity-pool=folioo-pool \
      --location=global \
      --project=folioo-488916
    ```

### 10.4 배포 후 Health Check 실패

```bash
# VM에 접속
gcloud compute ssh folioo-dev-server --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap

# 컨테이너 로그 확인
sudo docker logs --tail 100 folioo-dev-blue-1  # 또는 green

# 환경변수 확인 (.env 파일이 올바른지)
sudo cat /home/folioo/.env.dev

# Docker 이미지가 정상인지 확인
sudo docker images | grep folioo-server
```

### 10.5 VM에서 외부 네트워크 접근 불가

Cloud NAT 상태 확인:

```bash
gcloud compute routers nats describe folioo-nat \
  --router=folioo-router \
  --region=asia-northeast3 \
  --project=folioo-488916
```

### 10.6 Artifact Registry 인증 실패 (VM)

VM에서 Docker Pull 실패 시, 메타데이터 서버 토큰으로 인증:

```bash
# VM 내부에서
curl -sf 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' \
  -H 'Metadata-Flavor: Google' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])' \
  | docker login -u oauth2accesstoken --password-stdin https://asia-northeast3-docker.pkg.dev
```

---

## 11. 주의사항 및 금지 행위

### 절대 하지 말 것

1. **`terraform destroy` 실행 금지** — 전체 인프라가 삭제됩니다
2. **`*.tfvars` 파일을 git에 커밋 금지** — 민감 정보 포함
3. **정적 SA 키 생성 금지** — 모든 인증은 WIF/메타데이터 서버 사용
4. **VM `deletion_protection` 비활성화 금지** — 실수 방지 안전장치
5. **Artifact Registry의 `prevent_destroy` 제거 금지** — 이미지 저장소 보호
6. **Secret Manager 시크릿 삭제 금지** — 새 버전을 추가하세요 (이전 버전 자동 보관)
7. **Supabase 마이그레이션에 port 6543 사용 금지** — Transaction Pooler는 DDL 불가

### 신중하게 할 것

1. **Terraform apply는 반드시 plan을 먼저 확인** — 의도치 않은 리소스 재생성 방지
2. **Prod VM 작업 시 항상 Dev에서 먼저 테스트**
3. **tfvars 편집 후 반드시 GCS에 업로드하고 로컬 파일 삭제**
4. **IAM 역할 변경 시 최소 권한 원칙 준수**

---

## 12. 관련 문서 링크

| 문서                  | 경로                                                        |
| --------------------- | ----------------------------------------------------------- |
| 인프라 README         | [`infra/README.md`](../README.md)                           |
| 부트스트랩 절차       | [`infra/docs/backend-bootstrap.md`](./backend-bootstrap.md) |
| 환경변수 계약         | [`infra/docs/env-contract.md`](./env-contract.md)           |
| 서버 접속 정보        | `infra/.server.info` (gitignore, 로컬 전용)                 |
| Terraform CI          | `.github/workflows/terraform.yml`                           |
| Dev 배포 CD           | `.github/workflows/deploy-dev.yml`                          |
| Prod 배포 CD          | `.github/workflows/deploy.yml`                              |
| Docker Compose (공통) | `docker-compose.infra.yml`                                  |
| Docker Compose (Dev)  | `docker-compose.dev.yml`                                    |
| Docker Compose (Prod) | `docker-compose.prod.yml`                                   |
| 비용 추정             | `docs/infrastructure/COST_ESTIMATE.md`                      |
| Redis/Cache 가이드    | `docs/infrastructure/REDIS.md`                              |

---

## 부록: 빠른 참조 카드

```
# GCP 프로젝트
Project ID:     folioo-488916
Project Number: 798390960348
Region/Zone:    asia-northeast3 / asia-northeast3-a

# TF State
Bucket: gs://folioo-488916-tfstate

# VM 접속
gcloud compute ssh folioo-dev-server  --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap
gcloud compute ssh folioo-prod-server --zone=asia-northeast3-a --project=folioo-488916 --tunnel-through-iap

# 헬스체크
curl -sf https://dev-api.folioo.ai.kr/health
curl -sf https://prod-api.folioo.ai.kr/health

# Secret Manager
gcloud secrets versions access latest --secret=folioo-dev-config  --project=folioo-488916 | jq .
gcloud secrets versions access latest --secret=folioo-prod-config --project=folioo-488916 | jq .

# Terraform
cd infra
terraform init -backend-config="bucket=folioo-488916-tfstate"
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```
