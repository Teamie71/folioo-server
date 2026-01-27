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

## 문서 구조

```
docs/
├── development/
│   ├── GIT_CONVENTIONS.md     # Git/브랜치/커밋 컨벤션
│   ├── NAMING_CONVENTIONS.md  # 폴더/파일/클래스 네이밍 규칙
│   └── CODE_STYLE.md          # 코드 스타일 + 에러 처리 패턴
└── architecture/
    ├── ARCHITECTURE.md        # 아키텍처 설계
    └── ERD.md                 # 데이터베이스 설계
```

## 핵심 규칙

### 1. 에러 처리 계층

| 계층       | 책임                      |
| ---------- | ------------------------- |
| Repository | `null` 반환               |
| Service    | `BusinessException` throw |
| Controller | 입력 검증만               |

```typescript
// Repository - null 반환
async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
}

// Service - 예외 throw
async getProfile(userId: number): Promise<UserResDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    }
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

- **단방향 ManyToOne만 사용** (순환참조 방지)
- 양방향 OneToMany는 꼭 필요한 경우에만

## 도메인 구조

| 도메인               | 분류       | 설명                |
| -------------------- | ---------- | ------------------- |
| Experience           | Core       | 경험 정리 (AI 채팅) |
| Portfolio            | Core       | 포트폴리오          |
| Portfolio-Correction | Core       | 포트폴리오 첨삭     |
| Insight              | Supporting | 인사이트            |
| User                 | Supporting | 사용자              |
| Auth                 | Generic    | 인증 (OAuth)        |

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

1. **커밋 메시지에 AI 생성 표시 금지**
2. **any 타입 사용 금지**
3. **console.log 대신 Logger 사용**
4. **Issue 번호 없이 브랜치/커밋 생성 금지**
