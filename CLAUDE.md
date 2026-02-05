# Folioo Server - AI Assistant Context

> 이 파일은 AI 어시스턴트가 프로젝트를 이해하는 데 도움을 주는 컨텍스트 파일입니다.

## 프로젝트 개요

Folioo는 포트폴리오 관리 및 첨삭 플랫폼입니다. NestJS + TypeORM + PostgreSQL 기반.

## 기술 스택

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10.x
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **Package Manager**: pnpm
- **Language**: TypeScript (Strict Mode)

## 문서 경로

상세한 내용은 아래 문서 참조:

| 문서          | 경로                                     |
| ------------- | ---------------------------------------- |
| 아키텍처      | `docs/architecture/ARCHITECTURE.md`      |
| 도메인 전략   | `docs/architecture/DOMAIN_STRATEGY.md`   |
| ERD/DB 설계   | `docs/architecture/ERD.md`               |
| 코드 스타일   | `docs/development/CODE_STYLE.md`         |
| 예외 처리     | `docs/development/ERROR_HANDLING.md`     |
| Git 컨벤션    | `docs/development/GIT_CONVENTIONS.md`    |
| 네이밍 컨벤션 | `docs/development/NAMING_CONVENTIONS.md` |
| PR 템플릿     | `.github/PULL_REQUEST_TEMPLATE.md`       |
| Issue 템플릿  | `.github/ISSUE_TEMPLATE/`                |

## 핵심 규칙

### 1. 에러 처리 계층

| 계층       | 책임                              |
| ---------- | --------------------------------- |
| Repository | DB 관련 에러 throw (NOT_FOUND 등) |
| Service    | 비즈니스 로직 에러 throw          |
| Controller | 입력 검증만                       |

```typescript
// Repository - DB 관련 에러 throw
async findByIdOrThrow(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
}

// Service - 비즈니스 로직 처리
async getProfile(userId: number): Promise<UserResDto> {
    const user = await this.userRepository.findByIdOrThrow(userId);
    return UserResDto.from(user);
}
```

### 2. 예외 처리 규칙

- 커스텀 예외: `BusinessException` (유일하게 허용되는 예외 클래스)
- 에러 코드: `ErrorCode` enum
- 위치: `src/common/exceptions/`
- **NestJS 내장 예외 사용 금지** (`NotFoundException`, `BadRequestException` 등)
- ErrorCode 네이밍: `<DOMAIN><HTTP_STATUS><SEQUENCE?>` (예: `USER404`, `EXPERIENCE4091`)
- 새 에러 추가 시: `error-code.enum.ts` + `error-code.ts` 두 파일 모두 수정
- 상세 가이드: `docs/development/ERROR_HANDLING.md`

```typescript
// ✅ 올바른 사용
throw new BusinessException(ErrorCode.USER_NOT_FOUND);

// ❌ 금지
throw new NotFoundException('User not found');
```

### 3. DTO 네이밍

- Request: `*ReqDto` (예: `CreateUserReqDto`)
- Response: `*ResDto` (예: `UserResDto`)

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

| 도메인               | 분류    | 설명                                         |
| -------------------- | ------- | -------------------------------------------- |
| Experience           | Core    | 경험 정리 (AI 채팅), 서비스의 핵심 기능      |
| Portfolio            | Core    | 경험 정리의 결과물, 첨삭의 소스로 사용       |
| Portfolio-Correction | Core    | 포트폴리오 첨삭 서비스                       |
| Insight              | Core    | 인사이트/팁 정리                             |
| User                 | Generic | 사용자 (추후 userAuth-userProfile 분리 가능) |
| Auth                 | Generic | 인증 (passport - kakao/google/apple)         |

## 파일 처리 방식

- S3 사용 안 함
- `busboy`를 이용한 스트리밍 방식
- PDF를 `multipart/form-data`로 받아 AI 서버에 직접 전달

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
```

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
