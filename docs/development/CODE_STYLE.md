# TypeScript/NestJS 코드 스타일 가이드

## 기본 원칙

1. **TypeScript Strict Mode** 사용
2. **ESLint + Prettier** 규칙 준수
3. **일관성** 있는 코드 작성
4. **가독성** 우선

## 클래스 명명 규칙

| 유형 | 접미사 | 예시 |
|------|--------|------|
| Controller | `Controller` | `UserController` |
| Service | `Service` | `UserService` |
| Module | `Module` | `UserModule` |
| Entity | (없음) | `User` |
| Repository | `Repository` | `UserRepository` |
| DTO (생성) | `CreateDto` | `CreateUserDto` |
| DTO (수정) | `UpdateDto` | `UpdateUserDto` |
| DTO (응답) | `ResponseDto` | `UserResponseDto` |
| Guard | `Guard` | `JwtAuthGuard` |
| Decorator | `Decorator` | `CurrentUserDecorator` |
| Filter | `Filter` | `HttpExceptionFilter` |
| Interceptor | `Interceptor` | `TransformInterceptor` |
| Interface | (없음) | `UserPayload` |

## DTO 작성 규칙

### Request DTO

```typescript
// class-validator 데코레이터 사용
export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @ApiProperty({ example: '홍길동' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  bio?: string;
}
```

### Response DTO

```typescript
export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  // 정적 팩토리 메서드
  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    return dto;
  }
}
```

## Entity 작성 규칙

### 기본 구조

```typescript
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  bio?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 관계 정의
  @OneToMany(() => Portfolio, (portfolio) => portfolio.user)
  portfolios: Portfolio[];
}
```

### 관계 매핑

```typescript
// 다대일 관계 - LAZY 필수
@ManyToOne(() => User, (user) => user.portfolios, {
  lazy: true,
  onDelete: 'CASCADE',
})
@JoinColumn({ name: 'user_id' })
user: User;

// 일대다 관계
@OneToMany(() => Portfolio, (portfolio) => portfolio.user, {
  cascade: true,
})
portfolios: Portfolio[];
```

## Service 작성 규칙

### 기본 구조

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return UserResponseDto.from(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const user = this.userRepository.create(dto);
    const saved = await this.userRepository.save(user);
    return UserResponseDto.from(saved);
  }
}
```

## Controller 작성 규칙

### 기본 구조

```typescript
@Controller('users')
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: '사용자 조회' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '사용자 생성' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }
}
```

## 금지 사항

### 1. any 타입 사용 금지

```typescript
// 나쁜 예
function process(data: any) { ... }

// 좋은 예
function process(data: UserData) { ... }
function process<T>(data: T) { ... }
```

### 2. 콜백 지옥 금지

```typescript
// 나쁜 예
getUser(id, (user) => {
  getPortfolios(user.id, (portfolios) => {
    // ...
  });
});

// 좋은 예
const user = await this.userService.findOne(id);
const portfolios = await this.portfolioService.findByUserId(user.id);
```

### 3. 매직 넘버/스트링 금지

```typescript
// 나쁜 예
if (status === 1) { ... }
if (role === 'admin') { ... }

// 좋은 예
enum Status { ACTIVE = 1, INACTIVE = 0 }
enum Role { ADMIN = 'admin', USER = 'user' }

if (status === Status.ACTIVE) { ... }
if (role === Role.ADMIN) { ... }
```

### 4. console.log 금지 (프로덕션)

```typescript
// 나쁜 예
console.log('User created:', user);

// 좋은 예
this.logger.log(`User created: ${user.id}`);
```

## 권장 사항

### 1. 일관된 에러 처리

```typescript
// NestJS 내장 예외 사용
throw new NotFoundException('사용자를 찾을 수 없습니다.');
throw new BadRequestException('잘못된 요청입니다.');
throw new UnauthorizedException('인증이 필요합니다.');
throw new ForbiddenException('권한이 없습니다.');
```

### 2. Optional Chaining 사용

```typescript
// 나쁜 예
if (user && user.profile && user.profile.avatar) { ... }

// 좋은 예
if (user?.profile?.avatar) { ... }
```

### 3. Nullish Coalescing 사용

```typescript
// 나쁜 예
const name = user.name || 'Unknown';

// 좋은 예
const name = user.name ?? 'Unknown';
```

### 4. Destructuring 활용

```typescript
// 나쁜 예
const email = dto.email;
const name = dto.name;

// 좋은 예
const { email, name } = dto;
```

## Import 정렬 순서

```typescript
// 1. Node.js 내장 모듈
import * as path from 'path';

// 2. 외부 패키지
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 3. 내부 모듈 (절대 경로)
import { User } from '@modules/user/domain/entities/user.entity';

// 4. 상대 경로
import { CreateUserDto } from './dto/create-user.dto';
```
