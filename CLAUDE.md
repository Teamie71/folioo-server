# Folioo Server - AI Assistant Context

> 이 파일은 AI 어시스턴트가 프로젝트를 이해하는 데 도움을 주는 컨텍스트 파일입니다.

## 프로젝트 개요

Folioo는 포트폴리오 관리 및 첨삭 플랫폼입니다. NestJS + TypeORM + PostgreSQL 기반.

## 기술 스택

- **Runtime**: Node.js 20+
- **Framework**: NestJS 11.x
- **ORM**: TypeORM
- **Database**: PostgreSQL (로컬: Docker, dev/prod: Supabase 외부 연결)
- **Cache**: Upstash Redis REST API (dev/prod) / ioredis Docker (로컬)
- **Package Manager**: pnpm
- **Language**: TypeScript (Strict Mode)
- **배포**: GCE Blue-Green (docker-compose.infra.yml + dev/prod overlay)
- **이미지 레지스트리**: GCP Artifact Registry (`asia-northeast3-docker.pkg.dev/folioo-488916/folioo-docker/folioo-server`)

## 문서 경로

상세한 내용은 아래 문서 참조:

| 문서               | 경로                                        |
| ------------------ | ------------------------------------------- |
| 아키텍처           | `docs/architecture/ARCHITECTURE.md`         |
| 도메인 전략        | `docs/architecture/DOMAIN_STRATEGY.md`      |
| ERD/DB 설계        | `docs/architecture/ERD.md`                  |
| 코드 스타일        | `docs/development/CODE_STYLE.md`            |
| 예외 처리          | `docs/development/ERROR_HANDLING.md`        |
| Git 컨벤션         | `docs/development/GIT_CONVENTIONS.md`       |
| 네이밍 컨벤션      | `docs/development/NAMING_CONVENTIONS.md`    |
| DTO 검증 규칙      | `docs/development/DTO_VALIDATION.md`        |
| any 정책           | `docs/development/ANY_POLICY.md`            |
| DB 마이그레이션    | `docs/development/DB_MIGRATION_WORKFLOW.md` |
| Internal API 패턴  | `docs/development/INTERNAL_API_PATTERN.md`  |
| Dev Seed           | `docs/development/DEV_SEED.md`              |
| Dev DB Reset       | `docs/development/DEV_DB_RESET.md`          |
| API 현황           | `docs/API.md`                               |
| 환경변수 관리      | `docs/infrastructure/ENV_MANAGEMENT.md`     |
| Redis/Cache        | `docs/infrastructure/REDIS.md`              |
| 비용 추정          | `docs/infrastructure/COST_ESTIMATE.md`      |
| 인프라(Terraform)  | `infra/README.md`                           |
| Terraform 인수인계 | `infra/docs/TERRAFORM_HANDOVER.md`          |
| GCP 마이그레이션   | `infra/docs/GCP_MIGRATION_GUIDE.md`         |
| Env 계약           | `infra/docs/env-contract.md`                |
| PR 템플릿          | `.github/PULL_REQUEST_TEMPLATE.md`          |
| Issue 템플릿       | `.github/ISSUE_TEMPLATE/`                   |

## 핵심 규칙

### 1. 에러 처리 계층

| 계층       | 책임                                      |
| ---------- | ----------------------------------------- |
| Repository | 순수 데이터 접근만 (throw 금지)           |
| Service    | 모든 비즈니스 에러 throw (NOT_FOUND 포함) |
| Controller | 입력 검증만                               |

```typescript
// Repository - 순수 데이터 접근만 (throw 금지)
async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
}

// Service - NOT_FOUND 포함 모든 에러 throw
async findByIdOrThrow(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
}
```

### 2. 예외 처리 규칙

- 커스텀 예외: `BusinessException` (유일하게 허용되는 예외 클래스)
- 에러 코드: `ErrorCode` enum
- 위치: `src/common/exceptions/`
- 애플리케이션 코드에서 **NestJS 내장 예외 직접 throw 금지** (`NotFoundException`, `BadRequestException` 등)
- ErrorCode 네이밍: `<DOMAIN><HTTP_STATUS><SEQUENCE?>` (예: `USER404`, `EXPERIENCE4091`)
- 새 에러 추가 시: `error-code.enum.ts` + `error-code.ts` 두 파일 모두 수정
- 상세 가이드: `docs/development/ERROR_HANDLING.md`

```typescript
// ✅ 올바른 사용
throw new BusinessException(ErrorCode.USER_NOT_FOUND);

// ❌ 금지
throw new NotFoundException('User not found');
```

> 예외: 전역 `ValidationPipe`/`ParseIntPipe`가 프레임워크 내부에서 생성하는 `BadRequestException`은
> `GlobalExceptionFilter`에서 `ErrorCode.BAD_REQUEST`로 표준화 처리합니다.

### 3. DTO 네이밍

- Request: `*ReqDTO` (예: `CreateUserReqDTO`)
- Response: `*ResDTO` (예: `UserResDTO`)

### 4. 관계 매핑

- **단방향 `@ManyToOne`만 사용** (순환참조 방지)
- **`@OneToMany` 사용 금지** — SWC 컴파일러 환경에서 순환참조 유발
- 크로스 도메인 조인은 엔티티 클래스 참조 패턴 사용: `.innerJoin(EntityClass, 'alias', 'condition')`

### 5. 계층 구조 및 의존성 규칙

```
Controller → Facade / Service → Repository → Entity
```

- 상위 계층은 하위 계층에만 의존
- 인접하지 않은 하위 계층 의존 금지 (예: Controller → Repository)
- 타 도메인 간 의존은 Application Layer를 통해서만 허용

### 6. Facade vs Service

- **Facade (Orchestrator)**: 여러 Service를 조합하여 비즈니스 흐름을 제어. 순수 비즈니스 로직은 포함하지 않음
- **Service (Worker)**: 단일 도메인의 비즈니스 로직 수행. 자기 도메인의 Repository만 의존

| 호출 방향                       | 허용 |
| ------------------------------- | ---- |
| Facade → Service                | ⭕   |
| Service → Facade                | ❌   |
| Service → Service (동일 도메인) | ⭕   |
| Service → Service (타 도메인)   | ❌   |

타 도메인 로직이 필요한 경우 반드시 Facade를 통해 조합해야 합니다.

```typescript
// Facade - 여러 도메인의 Service를 조율
@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly externalPortfolioService: ExternalPortfolioService, // 포트폴리오 도메인
        private readonly portfolioCorrectionService: PortfolioCorrectionService // 첨삭 도메인
    ) {}
}

// Service - 자기 도메인의 Repository만 의존
@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}
}
```

## 도메인 구조

| 도메인               | 분류       | 설명                                         |
| -------------------- | ---------- | -------------------------------------------- |
| Experience           | Core       | 경험 정리 (AI 채팅 포함), 서비스의 핵심 기능 |
| Interview            | Core       | AI 인터뷰 세션 관리 (SSE 스트림, 연장 모드)  |
| Portfolio            | Core       | 경험 정리의 결과물, 첨삭의 소스로 사용       |
| Portfolio-Correction | Core       | 포트폴리오 첨삭 서비스 (RAG, 기업 분석)      |
| Insight              | Core       | 인사이트/팁 정리 (벡터 유사도 검색)          |
| Event                | Core       | 이벤트/챌린지 관리, 보상 수령                |
| User                 | Generic    | 사용자 (추후 userAuth-userProfile 분리 가능) |
| Auth                 | Generic    | 인증 (passport - kakao/google/naver)         |
| Ticket               | Generic    | 이용권 관리 (발급, 차감, 만료)               |
| Payment              | Generic    | 결제 (PayApp 연동, 웹훅, 취소)               |
| Admin                | Supporting | 관리자 대시보드 (이용권 수동 지급, 검색)     |
| Internal             | Supporting | AI 서버 연동 내부 API (X-API-Key 인증)       |
| Embedding            | Infra      | 벡터 임베딩 (pgvector, 코사인 유사도)        |

## 파일 처리 방식

- S3 사용 안 함
- `busboy`를 이용한 스트리밍 방식
- PDF를 `multipart/form-data`로 받아 AI 서버에 직접 전달

## 응답 컨벤션

- 전역 `TransformInterceptor`가 성공 응답을 `CommonResponse.success(result)` 형태로 래핑합니다.
- 따라서 DELETE API도 기본적으로 `204 No Content` 대신 `200 OK` + 메시지(`string`) 응답을 사용합니다.

## 자주 사용하는 명령어

```bash
# 개발 서버
pnpm run start:dev

# 빌드
pnpm run build

# 린트
pnpm run lint

# 테스트
pnpm run test

# (Dev) API 스모크 테스트
# access token을 준비한 뒤 OpenAPI 기반으로 dev 서버에 요청을 쏩니다.
export FOLIOO_ACCESS_TOKEN="<paste-access-token>"
node scripts/smoke-dev-api.mjs

# 변형 요청(POST/PATCH/DELETE)까지 포함
node scripts/smoke-dev-api.mjs --mutate --exclude '^/auth/(kakao|google|naver)'

# Internal API 스모크 테스트 (X-API-Key 인증)
export FOLIOO_INTERNAL_API_KEY="<paste-api-key>"
node scripts/smoke-dev-api.mjs --internal --mutate
```

## API 구현/테스트 문서

- `docs/API.md`에 API 구현 상태(IMPLEMENTED/NOT_IMPLEMENTED)와 수동/자동 테스트 방법을 기록합니다.

## Git 워크플로우 (필수)

> 이슈 생성, 브랜치 생성, 커밋, PR 생성 시 **반드시** 아래 규칙을 따라야 합니다.
> 상세 내용: `docs/development/GIT_CONVENTIONS.md`

### 이슈 생성

**반드시 `.github/ISSUE_TEMPLATE/`의 템플릿을 사용합니다.**

- 제목 형식: `[TYPE] 설명` (예: `[Feat] 포트폴리오 CRUD API 구현`, `[Task] 코드 스타일 가이드 업데이트`)
- 템플릿 선택 기준:
    - 기능 개발 → `feature-template.md`
    - 일반 작업 → `task.md`
    - 버그 → `bug_report.md`
- **모든 섹션을 빠짐없이 작성** (해당 없는 항목은 N/A로 표기)

### 브랜치 생성

```
<type>/<간단한_설명>-#<issue_number>
```

- 예: `feat/portfolio-crud-#15`, `docs/api-spec-#12`
- **Issue 번호 없이 브랜치 생성 금지**

### 커밋 메시지

```
<type>: <subject> (#<issue_number>)
```

- 예: `feat: 포트폴리오 생성 API 구현 (#15)`
- 타입: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `rename`, `remove`
- **Issue 번호 필수 포함**

### PR 생성

**반드시 `.github/PULL_REQUEST_TEMPLATE.md`의 모든 섹션을 작성합니다.**

- 제목 형식: `TYPE: 설명 (#이슈번호)` (예: `Feat: 포트폴리오 CRUD API 구현 (#15)`)
- **필수 섹션** (하나라도 빠지면 안 됨):
    - Summary
    - Changes
    - Type of Change
    - Target Environment (`Dev` 또는 `Prod`)
    - Related Issues (`Closes #이슈번호`)
    - Testing
    - Checklist
    - Screenshots (해당 없으면 `N/A`)
    - Additional Notes (해당 없으면 `N/A`)

## 주의사항

1. **any 타입 사용 금지**
2. **console.log 대신 Logger 사용**
3. **Issue 번호 없이 브랜치/커밋 생성 금지**

**절대로 커밋 메시지에 다음을 포함하지 마세요:**

- `🤖 Generated with Claude Code`
- `Co-Authored-By: Claude`
- AI가 생성했다는 어떤 표시도 금지
