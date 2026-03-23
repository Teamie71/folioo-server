# Folioo GCP 프로젝트 마이그레이션 가이드

> 이 문서는 Folioo 인프라를 새 GCP 프로젝트로 이전하는 전체 절차를 기술합니다.
> GCP 무료 크레딧 소진, 프로젝트 재구성 등의 이유로 새 프로젝트가 필요할 때 사용합니다.
>
> **예상 소요: ~40분** (Cloud SQL 없음, Supabase/Upstash는 외부 서비스)
>
> **마지막 실행**: -

---

## 전체 흐름 요약

```
Phase 0  [사람]    gcloud 인증 + 새 프로젝트 ID 전달
Phase 1  [작업자]  변수 설정 + GCP API 활성화
Phase 2  [작업자]  사전 리소스 (State 버킷, tfvars)
Phase 3  [작업자]  Terraform apply (VPC, NAT, GCE, AR, WIF, Cloudflare)
Phase 4  [작업자]  Secret Manager 마이그레이션
Phase 5  [작업자]  Docker 이미지 마이그레이션
Phase 6  [작업자]  VM 초기 설정 + 인프라 서비스 시작
Phase 7  [작업자]  CI/CD 연결 (GitHub Secrets + deploy-config)
Phase 8  [작업자]  코드 내 프로젝트 ID 교체 + PR
Phase 9  [작업자]  배포 테스트 + 검증
Phase 10 [사람]    구 프로젝트 삭제 (선택)
```

### 타임라인

| 구간                          | 소요 시간 | 비고                  |
| ----------------------------- | --------- | --------------------- |
| Phase 0 (인증)                | ~5분      | 사람 수행             |
| Phase 1-2 (API + 사전 리소스) | ~5분      |                       |
| Phase 3 (Terraform)           | ~10분     | Cloud SQL 없어서 빠름 |
| Phase 4-5 (시크릿 + 이미지)   | ~5분      |                       |
| Phase 6 (VM 설정)             | ~5분      |                       |
| Phase 7-8 (CI/CD + 코드)      | ~5분      |                       |
| Phase 9 (배포 + 검증)         | ~5분      |                       |
| **합계**                      | **~40분** |                       |

### Folioo 인프라의 특징 (이전 시 참고)

Folioo는 다음 서비스를 **GCP 외부**에서 사용하므로 마이그레이션 대상이 아닙니다:

| 서비스     | 제공자     | 마이그레이션   | 비고                              |
| ---------- | ---------- | -------------- | --------------------------------- |
| PostgreSQL | Supabase   | 불필요         | 연결 문자열만 Secret Manager에    |
| Redis      | Upstash    | 불필요         | REST URL/Token만 Secret Manager에 |
| DNS/Tunnel | Cloudflare | Terraform 관리 | 새 프로젝트에서 재생성            |

따라서 **데이터 마이그레이션(DB/스토리지)이 필요 없습니다**. GCP 리소스만 새로 만들면 됩니다.

---

## Phase 0: 사전 준비 [사람]

### 0-1. 새 GCP 프로젝트 준비

1. (선택) 새 Gmail 계정 생성 — 무료 크레딧용
2. https://console.cloud.google.com → 새 프로젝트 생성
3. **$300 무료 체험 크레딧 활성화** (결제 계정 연결)

### 0-2. gcloud 인증

```bash
gcloud auth login                          # 새 계정 로그인
gcloud config set project <NEW_PROJECT>    # 새 프로젝트 설정
gcloud auth application-default login      # Terraform용 ADC
```

### 0-3. 작업자에게 전달할 정보

```
새 프로젝트 ID: _______________
새 계정 이메일: _______________
구 프로젝트 ID: folioo-488916  (현재)
구 계정 이메일: _______________
```

---

## Phase 1: 변수 설정 + API 활성화

### 1-1. 변수 설정

```bash
# ── 사용자 입력 ──
NEW_PROJECT="<새 프로젝트 ID>"
NEW_ACCOUNT="<새 계정 이메일>"
OLD_PROJECT="folioo-488916"
OLD_ACCOUNT="<구 계정 이메일>"

# ── 자동 파생 (변경 금지) ──
REGION="asia-northeast3"
ZONE="${REGION}-a"
STATE_BUCKET="${NEW_PROJECT}-tfstate"
GITHUB_REPO="Teamie71/folioo-server"
```

**검증**:

```bash
gcloud config get-value project   # → ${NEW_PROJECT}
gcloud config get-value account   # → ${NEW_ACCOUNT}
```

### 1-2. GCP API 활성화

```bash
gcloud services enable \
  compute.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com \
  sts.googleapis.com \
  --project=${NEW_PROJECT}
```

**검증**:

```bash
gcloud services list --enabled --project=${NEW_PROJECT} | wc -l  # ≥ 9
```

---

## Phase 2: 사전 리소스 생성

### 2-1. Terraform State 버킷

```bash
gcloud storage buckets create "gs://${STATE_BUCKET}" \
  --project=${NEW_PROJECT} \
  --location=${REGION} \
  --uniform-bucket-level-access \
  --public-access-prevention

# 버전 관리 활성화 (state 복구용)
gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning
```

**검증**: `gcloud storage ls "gs://${STATE_BUCKET}/"`

### 2-2. terraform.tfvars 준비

```bash
# 구 프로젝트에서 tfvars 다운로드
gcloud config set account ${OLD_ACCOUNT}
gcloud storage cp "gs://${OLD_PROJECT}-tfstate/terraform.tfvars" /tmp/old-terraform.tfvars
gcloud config set account ${NEW_ACCOUNT}

# 프로젝트 ID만 교체
sed "s|${OLD_PROJECT}|${NEW_PROJECT}|g" /tmp/old-terraform.tfvars > /tmp/terraform.tfvars

# State 버킷에 업로드
gcloud storage cp /tmp/terraform.tfvars "gs://${STATE_BUCKET}/terraform.tfvars"
rm /tmp/old-terraform.tfvars /tmp/terraform.tfvars
```

> **주의**: Cloudflare 토큰(`cloudflare_api_token`)은 계정 단위이므로,
> 새 Cloudflare 계정을 사용하는 경우 토큰을 새로 발급받아 tfvars에 반영해야 합니다.

---

## Phase 3: Terraform Apply

### 3-1. Terraform Init

```bash
cd infra
rm -rf .terraform .terraform.lock.hcl    # 클린 초기화
gcloud storage cp "gs://${STATE_BUCKET}/terraform.tfvars" terraform.tfvars

terraform init -backend-config="bucket=${STATE_BUCKET}"
```

**검증**: `terraform state list 2>/dev/null | wc -l` → 0 (빈 state)

### 3-2. Plan + Apply

```bash
# 변경 계획 확인
terraform plan -var-file=terraform.tfvars

# 적용 (~10분)
terraform apply -var-file=terraform.tfvars
```

> `deletion_protection = true` 때문에 VM이 이미 존재하면 에러가 발생할 수 있습니다.
> 새 프로젝트이므로 정상적으로 모든 리소스가 생성됩니다.

**검증**:

```bash
# 리소스 수 확인
terraform state list | wc -l

# VM 상태
gcloud compute instances describe folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --format="value(status)"    # → RUNNING

gcloud compute instances describe folioo-prod-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --format="value(status)"    # → RUNNING

# Artifact Registry
gcloud artifacts repositories list --project=${NEW_PROJECT} --location=${REGION}
```

### 3-3. 핵심 출력값 추출

```bash
PROJECT_NUMBER=$(gcloud projects describe ${NEW_PROJECT} --format="value(projectNumber)")
WIF_PROVIDER=$(terraform output -raw wif_provider)
SA_EMAIL=$(terraform output -raw github_actions_sa_email)
NAT_IP=$(terraform output -raw nat_static_egress_ip)
AR_URL=$(terraform output -raw artifact_registry_url)

echo "Project Number: ${PROJECT_NUMBER}"
echo "WIF Provider:   ${WIF_PROVIDER}"
echo "SA Email:       ${SA_EMAIL}"
echo "NAT Egress IP:  ${NAT_IP}"
echo "AR URL:         ${AR_URL}"
```

### 3-4. NAT Egress IP 기록

새 프로젝트마다 NAT IP가 바뀝니다. 외부 서비스 IP 화이트리스트 업데이트가 필요합니다.

| 날짜           | 프로젝트 ID      | NAT Egress IP | PayApp 허용 IP | 비고 |
| -------------- | ---------------- | ------------- | -------------- | ---- |
| `<YYYY-MM-DD>` | `${NEW_PROJECT}` | `${NAT_IP}`   | TODO           |      |

```bash
# tfvars 정리 (민감 정보)
rm terraform.tfvars
```

---

## Phase 4: Secret Manager 마이그레이션

### 4-1. Secret 리소스 생성

```bash
# dev/prod 시크릿 생성 (빈 상태)
gcloud secrets create folioo-dev-config --project=${NEW_PROJECT} --replication-policy=automatic
gcloud secrets create folioo-prod-config --project=${NEW_PROJECT} --replication-policy=automatic
```

### 4-2. 구 프로젝트에서 시크릿 복사

Folioo는 Supabase/Upstash를 외부 서비스로 사용하므로, 시크릿 값은 **그대로 복사**하면 됩니다.
프로젝트 ID가 포함된 값은 없습니다.

```bash
# 구 프로젝트에서 시크릿 추출
gcloud config set account ${OLD_ACCOUNT}

OLD_DEV_SECRET=$(gcloud secrets versions access latest \
  --secret=folioo-dev-config --project=${OLD_PROJECT})

OLD_PROD_SECRET=$(gcloud secrets versions access latest \
  --secret=folioo-prod-config --project=${OLD_PROJECT})

gcloud config set account ${NEW_ACCOUNT}

# 새 프로젝트에 시크릿 저장
echo "${OLD_DEV_SECRET}" | \
  gcloud secrets versions add folioo-dev-config \
    --project=${NEW_PROJECT} --data-file=-

echo "${OLD_PROD_SECRET}" | \
  gcloud secrets versions add folioo-prod-config \
    --project=${NEW_PROJECT} --data-file=-
```

**검증**:

```bash
# dev 시크릿 키 확인
gcloud secrets versions access latest \
  --secret=folioo-dev-config --project=${NEW_PROJECT} | jq keys

# prod 시크릿이 올바른 프로필을 가리키는지 확인
gcloud secrets versions access latest \
  --secret=folioo-prod-config --project=${NEW_PROJECT} | jq -r '.APP_PROFILE'
# → prod
```

---

## Phase 5: Docker 이미지 마이그레이션

구 AR에서 최신 이미지를 가져와 새 AR에 push합니다.

```bash
# Docker registry 인증
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# 구 프로젝트에서 이미지 Pull
gcloud config set account ${OLD_ACCOUNT}
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

docker pull ${REGION}-docker.pkg.dev/${OLD_PROJECT}/folioo-docker/folioo-server:dev
docker pull ${REGION}-docker.pkg.dev/${OLD_PROJECT}/folioo-docker/folioo-server:latest

gcloud config set account ${NEW_ACCOUNT}
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# 새 AR로 tag + push
docker tag \
  ${REGION}-docker.pkg.dev/${OLD_PROJECT}/folioo-docker/folioo-server:dev \
  ${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server:dev

docker tag \
  ${REGION}-docker.pkg.dev/${OLD_PROJECT}/folioo-docker/folioo-server:latest \
  ${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server:latest

docker push ${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server:dev
docker push ${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server:latest
```

**검증**:

```bash
gcloud artifacts docker images list \
  ${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server --include-tags
# → dev, latest 태그 확인
```

---

## Phase 6: VM 초기 설정

### 6-1. VM Startup Script 완료 대기

VM 생성 후 startup script가 Docker를 설치합니다. 완료 확인:

```bash
# Dev VM에 SSH
gcloud compute ssh folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap

# startup script 완료 확인
ls /var/run/folioo-startup-complete   # 파일이 있으면 완료
docker --version                       # Docker 버전 출력되면 OK
```

### 6.2. 앱 디렉토리 및 환경 파일 설정

**Dev VM**:

```bash
gcloud compute ssh folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="
    sudo mkdir -p /home/folioo
    sudo docker network create folioo-network || true
  "
```

**Prod VM**:

```bash
gcloud compute ssh folioo-prod-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="
    sudo mkdir -p /home/folioo
    sudo docker network create folioo-network || true
  "
```

### 6-3. 환경 파일 배포

```bash
# Dev .env 생성 및 전송
gcloud secrets versions access latest \
  --project=${NEW_PROJECT} --secret=folioo-dev-config \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > /tmp/.env.dev

gcloud compute scp /tmp/.env.dev folioo-dev-server:~/.env.dev \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet

gcloud compute ssh folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="sudo mv ~/.env.dev /home/folioo/.env.dev && sudo chmod 600 /home/folioo/.env.dev"

# Prod .env 생성 및 전송
gcloud secrets versions access latest \
  --project=${NEW_PROJECT} --secret=folioo-prod-config \
  | jq -r 'to_entries[] | "\(.key | ascii_upcase)=\(.value)"' > /tmp/.env.prod

gcloud compute scp /tmp/.env.prod folioo-prod-server:~/.env.prod \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet

gcloud compute ssh folioo-prod-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="sudo mv ~/.env.prod /home/folioo/.env.prod && sudo chmod 600 /home/folioo/.env.prod"

# 로컬 파일 정리
rm /tmp/.env.dev /tmp/.env.prod
```

### 6-4. Compose 파일 전송 + 인프라 서비스 시작

**Dev VM**:

```bash
# Compose 파일 전송
gcloud compute scp docker-compose.infra.yml docker-compose.dev.yml \
  folioo-dev-server:~ \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet

gcloud compute ssh folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="
    sudo mv ~/docker-compose.infra.yml /home/folioo/docker-compose.infra.yml
    sudo mv ~/docker-compose.dev.yml /home/folioo/docker-compose.dev.yml
    cd /home/folioo

    # Cloudflare tunnel token 설정 (terraform output에서 가져온 값)
    # .env.dev에 TUNNEL_TOKEN이 없으면 수동 추가 필요
    # echo 'TUNNEL_TOKEN=<dev_tunnel_token>' | sudo tee -a .env.dev

    export DOCKER_IMAGE='${REGION}-docker.pkg.dev/${NEW_PROJECT}/folioo-docker/folioo-server'

    # Docker registry 인증
    curl -sf 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' \
      -H 'Metadata-Flavor: Google' \
      | python3 -c 'import sys, json; print(json.load(sys.stdin)[\"access_token\"])' \
      | docker login -u oauth2accesstoken --password-stdin https://${REGION}-docker.pkg.dev

    DC='sudo -E docker compose --env-file .env.dev -f docker-compose.infra.yml -f docker-compose.dev.yml'

    # 인프라 시작
    \$DC up -d traefik cloudflared

    # Blue 슬롯 시작
    \$DC --profile blue pull
    \$DC --profile blue up -d
  "
```

**Prod VM**: 동일한 절차를 `docker-compose.prod.yml`, `.env.prod`로 반복합니다.

**검증**:

```bash
# Dev
gcloud compute ssh folioo-dev-server \
  --zone=${ZONE} --project=${NEW_PROJECT} --tunnel-through-iap --quiet \
  --command="sudo docker ps --format 'table {{.Names}}\t{{.Status}}'"
# → folioo-traefik (healthy), folioo-tunnel, folioo-dev-blue-1 (healthy)
```

---

## Phase 7: CI/CD 연결

### 7-1. GitHub Secrets 업데이트

```bash
cd /home/sweetheart/projects/folioo/server   # 프로젝트 루트

gh secret set GCP_PROJECT_ID      --body "${NEW_PROJECT}"
gh secret set TF_STATE_BUCKET     --body "${STATE_BUCKET}"
gh secret set WIF_PROVIDER        --body "${WIF_PROVIDER}"
gh secret set WIF_SERVICE_ACCOUNT --body "${SA_EMAIL}"
```

> `SUPABASE_DEV_DB_URL`과 `SUPABASE_PROD_DB_URL`은 Supabase가 그대로이므로 변경 불필요.

### 7-2. deploy-config.json 업로드

```bash
cd infra
gcloud storage cp "gs://${STATE_BUCKET}/terraform.tfvars" terraform.tfvars
terraform init -backend-config="bucket=${STATE_BUCKET}"

terraform output -raw deploy_config > /tmp/deploy-config.json
gcloud storage cp /tmp/deploy-config.json "gs://${STATE_BUCKET}/deploy-config.json"

rm /tmp/deploy-config.json terraform.tfvars
```

**검증**:

```bash
gcloud storage cat "gs://${STATE_BUCKET}/deploy-config.json" | jq .
# → dev_gce_name, dev_gce_zone, prod_gce_name, prod_gce_zone
```

---

## Phase 8: 코드 내 프로젝트 ID 교체

### 8-1. 프로젝트 ID 일괄 교체

```bash
cd /home/sweetheart/projects/folioo/server

grep -rl "${OLD_PROJECT}" \
  --include="*.md" --include="*.yml" --include="*.yaml" \
  --include="*.tf" --include="*.json" \
  --exclude-dir=.git --exclude-dir=.terraform --exclude-dir=node_modules \
  . | xargs sed -i "s/${OLD_PROJECT}/${NEW_PROJECT}/g"
```

### 8-2. 영향받는 파일 확인

교체 대상 파일들:

- `CLAUDE.md` — 이미지 레지스트리 URL
- `docker-compose.dev.yml` — 기본 이미지 태그
- `docker-compose.prod.yml` — 기본 이미지 태그
- `infra/.server.info` — 서버 접속 정보 (gitignore 대상이지만 업데이트)
- 기타 문서 파일

### 8-3. .server.info 업데이트

`.server.info` 파일의 Project ID, Project Number, Secret 이름 등을 새 프로젝트에 맞게 업데이트합니다.

### 8-4. 이 런북 업데이트

```
마지막 실행: <오늘 날짜> (folioo-488916 → ${NEW_PROJECT})
```

### 8-5. 커밋 + PR

Git 컨벤션에 따라:

```bash
# 이슈 생성
gh issue create --title "[Task] GCP 프로젝트 마이그레이션 (${NEW_PROJECT})" \
  --body "..."

# 브랜치 + 커밋
git checkout -b chore/gcp-migration-#<이슈번호>
git add -A
git commit -m "chore: GCP 프로젝트 마이그레이션 ${OLD_PROJECT} → ${NEW_PROJECT} (#<이슈번호>)"
git push origin chore/gcp-migration-#<이슈번호>

# PR 생성
gh pr create --base dev --title "Chore: GCP 프로젝트 마이그레이션 (#<이슈번호>)" \
  --body "..."
```

---

## Phase 9: 배포 테스트 + 검증

### 9-1. 자동 배포 확인

PR을 `dev` 브랜치에 머지하면 `deploy-dev.yml`이 자동 실행됩니다.

```bash
# GitHub Actions 상태 확인
gh run list --workflow=deploy-dev.yml --limit 1

# 헬스체크
curl -sf https://dev-api.folioo.ai.kr/health
curl -sf https://prod-api.folioo.ai.kr/health
```

### 9-2. Terraform CI 확인

`infra/**` 파일이 변경되었으므로 `terraform.yml`도 실행됩니다.

```bash
gh run list --workflow=terraform.yml --limit 1
```

### 9-3. 외부 서비스 IP 화이트리스트 업데이트

NAT Egress IP가 바뀌었으므로, IP 제한을 사용하는 외부 서비스를 업데이트합니다.

**1) PayApp (결제)**

PayApp에서 허용 IP를 설정하고 있다면:

- PayApp 관리 콘솔에서 허용 IP에 `${NAT_IP}` 추가
- 웹훅 수신 URL이 `dev-api.folioo.ai.kr` / `prod-api.folioo.ai.kr`인지 확인

**2) Supabase**

Supabase 대시보드에서 Network Restrictions을 사용하는 경우:

- `${NAT_IP}/32`를 허용 IP에 추가

**3) Upstash**

Upstash에서 IP 화이트리스트를 사용하는 경우:

- `${NAT_IP}`를 허용 IP에 추가

**4) 기타**

소스 IP 화이트리스트를 요구하는 모든 외부 서비스 확인:

- OAuth 제공자 (카카오/구글/네이버) — 허용 IP 설정을 사용하는 경우
- AI 서버 — `AI_BASE_URL`의 대상 서버가 IP 제한을 사용하는 경우

### 9-4. 최종 검증 체크리스트

```
- [ ] terraform plan → No changes (state 일치)
- [ ] Dev 헬스체크: curl -sf https://dev-api.folioo.ai.kr/health
- [ ] Prod 헬스체크: curl -sf https://prod-api.folioo.ai.kr/health
- [ ] Dev VM: docker ps → traefik(healthy), tunnel, app 컨테이너
- [ ] Prod VM: docker ps → traefik(healthy), tunnel, app 컨테이너
- [ ] GitHub Actions: terraform.yml 초록불
- [ ] GitHub Actions: deploy-dev.yml 초록불
- [ ] GitHub Actions: deploy.yml 초록불 (main 머지 시)
- [ ] Secret Manager: dev/prod 시크릿 키 확인
- [ ] Cloudflare Tunnel: 터널 상태 정상 (Cloudflare 대시보드)
- [ ] 외부 서비스 IP 화이트리스트 업데이트 완료
```

---

## Phase 10: 구 프로젝트 삭제 [사람]

> 모든 검증이 완료된 후, 며칠간 운영 안정성을 확인한 뒤 삭제하세요.

```bash
gcloud config set account ${OLD_ACCOUNT}
gcloud projects delete ${OLD_PROJECT} --quiet
gcloud config set account ${NEW_ACCOUNT}
gcloud config set project ${NEW_PROJECT}
```

30일 유예기간 내 복구: `gcloud projects undelete ${OLD_PROJECT}`

---

## 주의사항 (마이그레이션 시 주의점)

### 절대 하지 말 것

1. **구 프로젝트의 Artifact Registry를 이미지 마이그레이션 전에 삭제/빌링 해제하지 말 것**
   — Docker 이미지를 가져올 수 없게 됩니다

2. **terraform.tfvars에서 Cloudflare 토큰을 구 프로젝트 값 그대로 사용할 수 있는지 확인**
   — Cloudflare 계정이 동일하면 토큰도 동일, 다른 계정이면 새 토큰 필요

3. **Secret Manager의 prod 시크릿이 `APP_PROFILE=prod`인지 반드시 검증**
   — dev/prod 혼동 방지

4. **`backend.tf`에 bucket을 하드코딩하지 말 것**
   — `terraform init -backend-config="bucket=..."` 방식 사용

### 마이그레이션 시 변경이 필요한 GitHub Secrets

| Secret                 | 값                                 | 변경 필요 |
| ---------------------- | ---------------------------------- | --------- |
| `GCP_PROJECT_ID`       | 새 프로젝트 ID                     | O         |
| `TF_STATE_BUCKET`      | `${NEW_PROJECT}-tfstate`           | O         |
| `WIF_PROVIDER`         | `projects/${PROJECT_NUMBER}/...`   | O         |
| `WIF_SERVICE_ACCOUNT`  | `github-actions@${NEW_PROJECT}...` | O         |
| `SUPABASE_DEV_DB_URL`  | (Supabase 연결 문자열)             | X (외부)  |
| `SUPABASE_PROD_DB_URL` | (Supabase 연결 문자열)             | X (외부)  |

### Secret Manager — 값 변경이 필요한 경우

기본적으로 Folioo의 Secret Manager 값은 **GCP 프로젝트 ID에 의존하지 않으므로** 그대로 복사합니다.
단, 다음 경우에는 수정이 필요합니다:

| 상황                   | 영향받는 키                           | 조치                  |
| ---------------------- | ------------------------------------- | --------------------- |
| Supabase 프로젝트 변경 | `SUPABASE_DB_URL`                     | 새 연결 문자열로 교체 |
| Upstash 인스턴스 변경  | `UPSTASH_REDIS_REST_*`                | 새 URL/Token으로 교체 |
| OAuth 콜백 도메인 변경 | `*_CALLBACK_URL`                      | 새 도메인으로 교체    |
| 도메인 자체가 변경     | `CORS_ORIGINS`, `CLIENT_REDIRECT_URI` | 새 도메인으로 교체    |

### 트러블슈팅

| 문제                         | 원인                           | 해결                                                |
| ---------------------------- | ------------------------------ | --------------------------------------------------- |
| `terraform init` 실패        | State 버킷 없거나 권한 부족    | `gcloud storage ls gs://${STATE_BUCKET}/` 확인      |
| VM SSH 접속 불가             | IAP 방화벽 미생성              | `terraform apply` 완료 확인, IAP 권한 확인          |
| Cloudflare Tunnel 연결 안 됨 | TUNNEL_TOKEN 미설정            | `.env`에 `TUNNEL_TOKEN` 확인, terraform output 참조 |
| Docker Pull 실패 (VM)        | AR 인증 만료                   | 메타데이터 서버 토큰으로 재인증 (Phase 6-4 참조)    |
| WIF 인증 실패                | PROJECT_NUMBER 불일치          | `gcloud projects describe ${NEW_PROJECT}` 재확인    |
| 헬스체크 실패                | 컨테이너 미기동 또는 .env 누락 | VM SSH 후 `docker ps`, `.env` 파일 확인             |
| 배포 CD 실패                 | deploy-config.json 없음        | Phase 7-2 실행하여 GCS에 업로드                     |

---

## 마이그레이션 히스토리

| 날짜 | 구 프로젝트 | 신규 프로젝트   | NAT Egress IP           | 비고      |
| ---- | ----------- | --------------- | ----------------------- | --------- |
| -    | -           | `folioo-488916` | (terraform output 참조) | 최초 구축 |
