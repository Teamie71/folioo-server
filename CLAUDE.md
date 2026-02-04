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
| ERD/DB 설계   | `docs/architecture/ERD.md`               |
| 코드 스타일   | `docs/development/CODE_STYLE.md`         |
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

### 2. 예외 클래스

- 커스텀 예외: `BusinessException`
- 에러 코드: `ErrorCode` enum
- 위치: `src/common/exceptions/`

### 3. DTO 네이밍

- Request: `*ReqDto` (예: `CreateUserReqDto`)
- Response: `*ResDto` (예: `UserResDto`)

### 4. 관계 매핑

- **단방향 `@ManyToOne`만 사용** (순환참조 방지)
- **`@OneToMany` 사용 금지** — SWC 컴파일러 환경에서 순환참조 유발
- 크로스 도메인 조인은 엔티티 클래스 참조 패턴 사용: `.innerJoin(EntityClass, 'alias', 'condition')`

## 도메인 구조

| 도메인               | 분류    | 설명                |
| -------------------- | ------- | ------------------- |
| Experience           | Core    | 경험 정리 (AI 채팅) |
| Portfolio            | Core    | 포트폴리오          |
| Portfolio-Correction | Core    | 포트폴리오 첨삭     |
| Insight              | Core    | 인사이트            |
| User                 | Generic | 사용자              |
| Auth                 | Generic | 인증 (OAuth)        |

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

## 주의사항

1. **any 타입 사용 금지**
2. **console.log 대신 Logger 사용**
3. **Issue 번호 없이 브랜치/커밋 생성 금지**

**절대로 커밋 메시지에 다음을 포함하지 마세요:**

- `🤖 Generated with Claude Code`
- `Co-Authored-By: Claude`
- AI가 생성했다는 어떤 표시도 금지
