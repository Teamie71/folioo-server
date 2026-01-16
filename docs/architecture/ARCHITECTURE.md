# 프로젝트 아키텍처

## 개요

Folioo Server는 **도메인 기반 계층형 아키텍처 (DDD)**를 채택하고 있습니다.
Package by Feature + Layered Architecture를 결합하여 도메인별로 코드를 그룹화하고, 각 도메인 내부에서 계층을 분리합니다.

---

## DDD 도메인 분류 기준

### 1. 비즈니스 중요도에 따른 분류 (Subdomain)

| 분류 | 기준 | 전략 |
|------|------|------|
| **핵심 도메인 (Core)** | 프로젝트의 진짜 이유, 경쟁사와 차별화되는 핵심 기능 | 가장 공들여 개발 |
| **지원 도메인 (Supporting)** | 핵심은 아니지만 서비스 운영에 필요한 기능 | 적당한 수준으로 개발 |
| **일반 도메인 (Generic)** | 어느 서비스에나 있는 흔한 기능 | 외부 라이브러리/SaaS 활용 |

### 2. "언어의 의미"가 바뀌는 경계 (Bounded Context)

**같은 단어(Entity)가 문맥에 따라 뜻이나 필요한 속성이 달라진다면, 거기가 도메인을 나눌 지점입니다.**

예시: 'User(사용자)'

| 도메인 | 관심사 | 목적 |
|--------|--------|------|
| Auth | email, password, loginAt, isVerified | 로그인이 되는가? |
| Profile | nickname, profileImage, introduce | 남들에게 어떻게 보이는가? |
| Payment | address, phoneNumber, credit | 결제는 어떻게 하는가? |

> **잘못된 설계**: 모든 속성을 하나의 User 엔티티에 다 넣기 (God Class)
> **DDD 설계**: AuthUser, Profile, Customer 등으로 도메인을 쪼개고 각각 별도 엔티티로 관리

### 3. 데이터의 라이프사이클 (변경의 주기)

같이 변하는 것들은 모으고, 따로 변하는 것들은 분리합니다.

- "A 기능을 수정할 때 B 기능도 같이 수정해야 하나?"
- "트랜잭션이 한 번에 묶여야 하는가?"

---

## 도메인 분류

| 도메인 | 분류 | 설명 |
|--------|------|------|
| **Experience** | Core | 경험 정리 (AI 채팅 포함), 서비스의 핵심 기능 |
| **Portfolio** | Core | 경험 정리의 결과물, 첨삭의 소스로 사용 |
| **Portfolio-Correction** | Core | 포트폴리오 첨삭 서비스 |
| **Insight** | Supporting | 인사이트/팁 정리 |
| **User** | Supporting | 사용자 도메인 (추후 userAuth-userProfile 분리 가능) |
| **Upload** | Supporting | 버킷 스토리지 파일 저장 (presigned-url) |
| **Auth** | Generic | 인증 (passport - kakao/google/apple) |
| **Payment** | Generic | 결제 (예정) |

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
    ├── user/                    # 사용자 (Supporting)
    │   ├── domain/              # 도메인 계층
    │   │   ├── entities/        # 엔티티
    │   │   └── repositories/    # 리포지토리 인터페이스
    │   ├── application/         # 애플리케이션 계층
    │   │   ├── services/        # 서비스
    │   │   └── dtos/            # DTO
    │   └── presentation/        # 프레젠테이션 계층
    │       └── controllers/     # 컨트롤러
    ├── experience/              # 경험 정리 (Core)
    ├── portfolio/               # 포트폴리오 (Core)
    ├── portfolio-correction/    # 포트폴리오 첨삭 (Core)
    ├── insight/                 # 인사이트 (Supporting)
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

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return UserResponseDto.from(user);
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

  @OneToMany(() => Portfolio, (portfolio) => portfolio.user)
  portfolios: Portfolio[];
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

외부 서비스는 `infra/` 또는 별도 모듈로 추상화합니다.

```
src/
└── modules/
    └── auth/
        └── infra/
            ├── kakao/           # 카카오 OAuth
            ├── google/          # 구글 OAuth
            └── apple/           # 애플 OAuth
```

---

## 테스트 전략

| 계층 | 테스트 유형 | 도구 |
|------|------------|------|
| Controller | E2E 테스트 | Supertest |
| Service | 단위 테스트 | Jest + Mock |
| Repository | 통합 테스트 | TestContainer |
