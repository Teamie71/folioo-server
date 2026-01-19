import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';
import { LoginUsecase } from './application/usecases/login.usecase';
import { KakaoStrategy } from './infrastructure/strategies/kakao.strategy';
import { TokenService } from './infrastructure/services/token.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>('JWT_SECRET_TOKEN'),
                signOptions: {
                    expiresIn: configService.get<number>('JWT_EXPIRES_IN') || 60 * 60,
                },
            }),
            inject: [ConfigService],
        }),
        UserModule,
    ],
    controllers: [AuthController],
    providers: [LoginUsecase, KakaoStrategy, TokenService, JwtAuthGuard, JwtStrategy],
    exports: [JwtAuthGuard],
})
export class AuthModule {}
