# 프로젝트 아키텍처

## 개요

Folioo Server는 **도메인 기반 계층형 아키텍처 (DDD)**를 채택하고 있습니다.
Package by Feature + Layered Architecture를 결합하여 도메인별로 코드를 그룹화하고, 각 도메인 내부에서 계층을 분리합니다.

---

## DDD 도메인 분류 기준

### 1. 비즈니스 중요도에 따른 분류 (Subdomain)

| 분류                         | 기준                                                | 전략                      |
| ---------------------------- | --------------------------------------------------- | ------------------------- |
| **핵심 도메인 (Core)**       | 프로젝트의 진짜 이유, 경쟁사와 차별화되는 핵심 기능 | 가장 공들여 개발          |
| **지원 도메인 (Supporting)** | 핵심은 아니지만 서비스 운영에 필요한 기능           | 적당한 수준으로 개발      |
| **일반 도메인 (Generic)**    | 어느 서비스에나 있는 흔한 기능                      | 외부 라이브러리/SaaS 활용 |

### 2. "언어의 의미"가 바뀌는 경계 (Bounded Context)

**같은 단어(Entity)가 문맥에 따라 뜻이나 필요한 속성이 달라진다면, 거기가 도메인을 나눌 지점입니다.**

예시: 'User(사용자)'

| 도메인  | 관심사                               | 목적                      |
| ------- | ------------------------------------ | ------------------------- |
| Auth    | email, password, loginAt, isVerified | 로그인이 되는가?          |
| Profile | nickname, profileImage, introduce    | 남들에게 어떻게 보이는가? |
| Payment | address, phoneNumber, credit         | 결제는 어떻게 하는가?     |

> **잘못된 설계**: 모든 속성을 하나의 User 엔티티에 다 넣기 (God Class)
> **DDD 설계**: AuthUser, Profile, Customer 등으로 도메인을 쪼개고 각각 별도 엔티티로 관리

### 3. 데이터의 라이프사이클 (변경의 주기)

같이 변하는 것들은 모으고, 따로 변하는 것들은 분리합니다.

- "A 기능을 수정할 때 B 기능도 같이 수정해야 하나?"
- "트랜잭션이 한 번에 묶여야 하는가?"

---

## 도메인 분류

| 도메인                   | 분류    | 설명                                                |
| ------------------------ | ------- | --------------------------------------------------- |
| **Experience**           | Core    | 경험 정리 (AI 채팅 포함), 서비스의 핵심 기능        |
| **Portfolio**            | Core    | 경험 정리의 결과물, 첨삭의 소스로 사용              |
| **Portfolio-Correction** | Core    | 포트폴리오 첨삭 서비스                              |
| **Insight**              | Core    | 인사이트/팁 정리                                    |
| **User**                 | Generic | 사용자 도메인 (추후 userAuth-userProfile 분리 가능) |
| **Auth**                 | Generic | 인증 (passport - kakao/google/apple)                |
| **Payment**              | Generic | 결제 (예정)                                         |

---

## 계층 구조

```
Presentation Layer (Controller)
         ↓
Application Layer (Service, DTO)
         ↓
Domain Layer (Entity, Repository Interface)
         ↓
Infrastructure Layer (TypeORM Repository)
```

---

## 패키지 구조

```
src/
├── common/                      # 공통 모듈
│   ├── decorators/              # 커스텀 데코레이터
│   ├── dtos/                    # 공통 DTO (페이지네이션 등)
│   ├── entities/                # 베이스 엔티티
│   ├── exceptions/              # 커스텀 예외
│   ├── filters/                 # 예외 필터
│   └── interceptors/            # 인터셉터
│
├── config/                      # 설정
│   ├── swagger.config.ts        # Swagger 설정
│   └── typeorm-config.ts        # TypeORM 설정
│
└── modules/                     # 비즈니스 도메인
    ├── auth/                    # 인증 (Generic)
    ├── user/                    # 사용자 (Generic)
    │   ├── domain/              # 도메인 계층
    │   │   └── entities/        # 엔티티
    │   ├── application/         # 애플리케이션 계층
    │   │   ├── services/        # 서비스
    │   │   └── dtos/            # DTO
    │   ├── infrastructure/      # 인프라 계층
    │   │   └── repositories/    # TypeORM 리포지토리 구현체
    │   └── presentation/        # 프레젠테이션 계층
    │       └── controllers/     # 컨트롤러
    ├── experience/              # 경험 정리 (Core)
    ├── portfolio/               # 포트폴리오 (Core)
    ├── portfolio-correction/    # 포트폴리오 첨삭 (Core)
    ├── insight/                 # 인사이트 (Core)
    ├── upload/                  # 파일 업로드 (Supporting)
    └── payment/                 # 결제 (Generic, 예정)
```

---

## 계층별 책임

### Presentation Layer (Controller)

- HTTP 요청/응답 처리
- 입력 유효성 검사 (ValidationPipe)
- Swagger 문서화
- 인증/인가 처리

```typescript
@Controller('users')
@ApiTags('User')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get(':id')
    @ApiOperation({ summary: '사용자 조회' })
    async findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }
}
```

### Application Layer (Service)

- 비즈니스 로직 구현
- 트랜잭션 관리
- DTO 변환
- **비즈니스 로직 에러 처리** (BusinessException throw)

```typescript
@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async findOne(id: string): Promise<UserResDto> {
        // Repository에서 NOT_FOUND 처리
        const user = await this.userRepository.findByIdOrThrow(id);
        return UserResDto.from(user);
    }
}
```

### Domain Layer (Entity)

- 도메인 모델 정의
- 비즈니스 규칙 캡슐화

```typescript
@Entity('users')
export class User extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    name: string;
}
```

### Infrastructure Layer (Repository)

- 데이터 접근 구현
- **DB 관련 에러 처리** (NOT_FOUND 등)

```typescript
@Injectable()
export class UserRepository {
    async findByIdOrThrow(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }
}
```

---

## 의존성 규칙

```
Controller → Service → Repository → Entity
    ↓           ↓           ↓
   DTO         DTO       Entity
```

- 상위 계층은 하위 계층에만 의존
- 같은 계층 간 순환 의존 금지
- Entity는 다른 계층에 의존하지 않음

---

## 외부 서비스 통합

### 인증 (OAuth)

```
src/
└── modules/
    └── auth/
        └── infrastructure/
            ├── strategies/       # Passport 전략
            │   ├── kakao.strategy.ts
            │   ├── google.strategy.ts
            │   └── apple.strategy.ts
            └── guards/           # 인증 가드
```

### 파일 처리 (AI 서버 연동)

> **결정사항 (2026-01)**: S3 사용하지 않음. busboy를 이용한 스트리밍 방식 채택.

**배경**:

- 백엔드에서 PDF 파일을 AI 서버로 전달해야 함
- S3에 저장 후 URL 전달 vs 직접 스트리밍 검토

**결정**:

- `multipart/form-data`로 PDF 파일 수신
- `busboy`를 이용해 메모리 버퍼링 없이 스트리밍
- AI 서버로 직접 전달 (메모리 과부하 방지)

```typescript
// 파일 처리 흐름
Client (PDF)
  → NestJS (busboy 스트리밍)
    → AI Server (직접 전달)
```

**장점**:

- S3 비용 절감
- 단순한 아키텍처

> **Note**: 서비스 기획상 PDF 파일은 10MB 이하로 제한되어 있어, 별도 스토리지 없이 스트리밍 방식으로 처리합니다.

---

## 테스트 전략

| 계층       | 테스트 유형 | 도구          |
| ---------- | ----------- | ------------- |
| Controller | E2E 테스트  | Supertest     |
| Service    | 단위 테스트 | Jest + Mock   |
| Repository | 통합 테스트 | TestContainer |

---

## 변경 이력

| 버전  | 날짜       | 변경 내용                                                       |
| ----- | ---------- | --------------------------------------------------------------- |
| 1.1.0 | 2026-01-28 | 파일 처리 방식 변경 (S3 → busboy 스트리밍), 에러 처리 패턴 명시 |
| 1.0.0 | 2026-01-16 | 최초 작성                                                       |
