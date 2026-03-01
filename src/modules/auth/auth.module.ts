import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { LoginUsecase } from './application/usecases/login.usecase';
import { KakaoStrategy } from './infrastructure/strategies/kakao.strategy';
import { TokenService } from './infrastructure/services/token.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtRefreshGuard } from './infrastructure/guards/jwt-refresh.guard';
import { JwtRefreshStrategy } from './infrastructure/strategies/jwt-refresh.strategy';
import { StringValue } from 'ms';
import { AuthTokenStoreService } from './infrastructure/services/auth-token-store.service';
import { LogoutUsecase } from './application/usecases/logout.usecase';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET_TOKEN'),
                signOptions: {
                    expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1h') as StringValue,
                },
            }),
            inject: [ConfigService],
        }),
        UserModule,
    ],
    controllers: [AuthController],
    providers: [
        LoginUsecase,
        LogoutUsecase,
        KakaoStrategy,
        TokenService,
        AuthTokenStoreService,
        JwtAuthGuard,
        {
            provide: APP_GUARD,
            useExisting: JwtAuthGuard,
        },
        JwtStrategy,
        JwtRefreshGuard,
        JwtRefreshStrategy,
    ],
    exports: [JwtAuthGuard],
})
export class AuthModule {}
