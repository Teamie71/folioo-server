# TypeScript/NestJS 코드 스타일 가이드

## 기본 원칙

1. **TypeScript Strict Mode** 사용
2. **ESLint + Prettier** 규칙 준수
3. **일관성** 있는 코드 작성
4. **가독성** 우선

## 클래스 명명 규칙

| 유형        | 접미사        | 예시                   |
| ----------- | ------------- | ---------------------- |
| Controller  | `Controller`  | `UserController`       |
| Service     | `Service`     | `UserService`          |
| Module      | `Module`      | `UserModule`           |
| Entity      | (없음)        | `User`                 |
| Repository  | `Repository`  | `UserRepository`       |
| DTO (생성)  | `CreateDto`   | `CreateUserDto`        |
| DTO (수정)  | `UpdateDto`   | `UpdateUserDto`        |
| DTO (응답)  | `ResponseDto` | `UserResponseDto`      |
| Guard       | `Guard`       | `JwtAuthGuard`         |
| Decorator   | `Decorator`   | `CurrentUserDecorator` |
| Filter      | `Filter`      | `HttpExceptionFilter`  |
| Interceptor | `Interceptor` | `TransformInterceptor` |
| Interface   | (없음)        | `UserPayload`          |

## DTO 작성 규칙

> **Note**: 프로젝트에서 [NestJS Swagger CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin)을 사용 중이므로
> `@ApiProperty()` 데코레이터는 **필수가 아닙니다**.
> 다만, `example` 값이나 `enum` 타입 등 **자세한 명세가 필요한 경우**에만 사용합니다.

### Request DTO

```typescript
// class-validator 데코레이터 사용
export class CreateUserDto {
    @IsEmail()
    @ApiProperty({ example: 'user@example.com' }) // example 명시 필요한 경우
    email: string;

    @IsString()
    @MinLength(2)
    @MaxLength(20)
    name: string; // 기본 타입은 플러그인이 자동 추론

    @IsOptional()
    @IsString()
    bio?: string;

    @IsEnum(LoginType)
    @ApiProperty({ enum: LoginType }) // enum 타입은 명시 필요
    loginType: LoginType;
}
```

### Response DTO

```typescript
export class UserResponseDto {
    id: string; // Swagger 플러그인이 자동 추론
    email: string;
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
}
```

### 관계 매핑

> **Note**: 모듈 간 순환참조 방지를 위해 **단방향 매핑(ManyToOne)만 사용**합니다.
> 양방향 매핑(`OneToMany`)은 꼭 필요한 경우에만 사용합니다.

```typescript
// 다대일 관계 (단방향) - LAZY 필수
@ManyToOne(() => User, {
  lazy: true,
  onDelete: 'CASCADE',
})
@JoinColumn({ name: 'user_id' })
user: User;
```

## Service 작성 규칙

### 기본 구조

```typescript
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService
    ) {}

    async findOne(id: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
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

프로젝트에서 정의한 `BusinessException`과 `ErrorCode`를 사용하여 에러를 처리합니다.

```typescript
// error-code.enum.ts
export enum ErrorCode {
    // 공통
    BAD_REQUEST = 'COMMON400',
    UNAUTHORIZED = 'COMMON401',
    INTERNAL_SERVER_ERROR = 'COMMON500',
    NOT_IMPLEMENTED = 'COMMON501',

    // 도메인별 에러 코드 추가
    USER_NOT_FOUND = 'USER404',
}

// 서비스에서 사용
throw new BusinessException(ErrorCode.BAD_REQUEST);
throw new BusinessException(ErrorCode.UNAUTHORIZED);
throw new BusinessException(ErrorCode.USER_NOT_FOUND);
```

> 참고: `common/exceptions/` 디렉토리의 `error-code.enum.ts`, `error-code.ts`, `business.exception.ts` 파일 참조

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

## package.json Scripts 작성 가이드

### CI/Docker 환경 고려

npm lifecycle scripts (`prepare`, `postinstall` 등)는 CI/Docker 환경에서 자동으로 실행되므로 환경 체크가 필요합니다.

#### prepare 스크립트

Git hooks 관리 도구(husky)는 `.git` 폴더가 필요하므로 존재 여부를 확인해야 합니다:

```json
{
    "scripts": {
        "prepare": "node -e \"if (require('fs').existsSync('.git')) { require('child_process').execSync('husky', {stdio: 'inherit'}) }\""
    }
}
```

**이유:**

- Docker 컨테이너 빌드 시 `.git` 폴더가 없어 husky 실행 실패
- `pnpm install` 실행 시 `prepare` 스크립트가 자동으로 실행됨
- `.git`이 있는 환경에서는 husky 실행 오류를 정상적으로 전파하여 설정 문제를 즉시 발견 가능

#### 잘못된 예시

```json
{
    "scripts": {
        // ❌ .git 폴더 체크 없이 실행 - Docker 빌드 실패
        "prepare": "husky",

        // ❌ if 문법 사용 - Windows 환경에서 실행 불가
        "prepare": "if [ -d .git ]; then husky; fi",

        // ❌ try-catch로 모든 에러 무시 - husky 설정 오류도 숨겨짐
        "prepare": "node -e \"try { require('fs').statSync('.git') && require('child_process').execSync('husky', {stdio: 'inherit'}) } catch {}\""
    }
}
```

#### 올바른 예시

```json
{
    "scripts": {
        // ✅ .git 체크만 하고 husky 오류는 정상 전파
        "prepare": "node -e \"if (require('fs').existsSync('.git')) { require('child_process').execSync('husky', {stdio: 'inherit'}) }\"",

        // ✅ 환경 변수로 CI 환경 감지
        "postinstall": "node -e \"if (!process.env.CI) { require('child_process').execSync('some-command', {stdio: 'inherit'}) }\""
    }
}
```

### pnpm 버전 명시

`packageManager` 필드로 pnpm 버전을 명시하면 CI/CD와 Dockerfile에서 동일한 버전을 사용할 수 있습니다:

```json
{
    "packageManager": "pnpm@10.11.0"
}
```

Dockerfile에서 이 버전과 일치시켜야 합니다:

```dockerfile
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
```
