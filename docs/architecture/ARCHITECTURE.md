# 프로젝트 아키텍처

## 개요

Folioo Server는 **도메인 기반 계층형 아키텍처**를 채택하고 있습니다.
Package by Feature + Layered Architecture를 결합하여 도메인별로 코드를 그룹화하고, 각 도메인 내부에서 계층을 분리합니다.

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
    ├── auth/                    # 인증 도메인
    ├── user/                    # 사용자 도메인
    │   ├── domain/              # 도메인 계층
    │   │   ├── entities/        # 엔티티
    │   │   └── repositories/    # 리포지토리 인터페이스
    │   ├── application/         # 애플리케이션 계층
    │   │   ├── services/        # 서비스
    │   │   └── dtos/            # DTO
    │   └── presentation/        # 프레젠테이션 계층
    │       └── controllers/     # 컨트롤러
    ├── portfolio/               # 포트폴리오 도메인
    ├── experience/              # 경력 도메인
    ├── portfolio-correction/    # 포트폴리오 첨삭 도메인
    └── insight/                 # 인사이트 도메인
```

## 도메인 설명

| 도메인 | 설명 |
|--------|------|
| Auth | JWT 기반 인증, 소셜 로그인 |
| User | 사용자 정보 관리 |
| Portfolio | 포트폴리오 CRUD |
| Experience | 경력 사항 관리 |
| Portfolio-Correction | 포트폴리오 첨삭 서비스 |
| Insight | 인사이트/팁 콘텐츠 |

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

## 의존성 규칙

```
Controller → Service → Repository → Entity
    ↓           ↓           ↓
   DTO         DTO       Entity
```

- 상위 계층은 하위 계층에만 의존
- 같은 계층 간 순환 의존 금지
- Entity는 다른 계층에 의존하지 않음

## 외부 서비스 통합

외부 서비스는 `infra/` 또는 별도 모듈로 추상화합니다.

```
src/
└── modules/
    └── auth/
        └── infra/
            ├── kakao/           # 카카오 OAuth
            └── google/          # 구글 OAuth
```

## 테스트 전략

| 계층 | 테스트 유형 | 도구 |
|------|------------|------|
| Controller | E2E 테스트 | Supertest |
| Service | 단위 테스트 | Jest + Mock |
| Repository | 통합 테스트 | TestContainer |
