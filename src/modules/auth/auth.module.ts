// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UserOrmEntity } from '../user/domain/orm/user.orm-entity';
import { RefreshTokenOrmEntity } from './infra/orm/refresh-token.orm-entity';

import { KAKAO_OAUTH_PORT } from './application/ports/kakao-oauth.port';
import { USER_AUTH_PORT } from './application/ports/user-auth.port';
import { REFRESH_TOKEN_STORE_PORT } from './application/ports/refresh-token-store.port';

import { KakaoOAuthClient } from './infra/adapters/kakao-oauth.client';
import { UserAuthTypeormAdapter } from './infra/adapters/user-auth.typeorm.adapter';

import { JwtTokenService } from './infra/token/jwt-token-issuer';
import { AuthController } from './infra/controllers/auth.controller';

import { StartKakaoLoginUseCase } from './application/usecases/start-kakao-login.usecase';
import { RefreshUseCase } from './application/usecases/refresh.usecase';
import { CompleteKakaoOauthUseCase } from './application/usecases/complete-kakao-oauth.usecase';
import { LogoutUseCase } from './application/usecases/logout.usecase';
import { UnlinkUseCase } from './application/usecases/unlink.usecase';
import { JwtAccessGuard } from './infra/guards/jwt-access.guard';
import { KakaoLoginUseCase } from './application/usecases/kakao-login.usecase';
import { RefreshTokenStoreTypeormAdapter } from './infra/adapters/refresh-token-stroe.typeorm.adapter';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserOrmEntity, RefreshTokenOrmEntity]),
        JwtModule.register({}), // secret은 service에서 직접 넣고 있어서 비워도 됨
    ],
    controllers: [AuthController],
    providers: [
        // ports -> adapters
        { provide: KAKAO_OAUTH_PORT, useClass: KakaoOAuthClient },
        { provide: USER_AUTH_PORT, useClass: UserAuthTypeormAdapter },
        { provide: REFRESH_TOKEN_STORE_PORT, useClass: RefreshTokenStoreTypeormAdapter },

        // infra services
        JwtTokenService,
        JwtAccessGuard,

        // usecases
        StartKakaoLoginUseCase,
        CompleteKakaoOauthUseCase,
        RefreshUseCase,
        LogoutUseCase,
        KakaoLoginUseCase,
        UnlinkUseCase,
    ],
})
export class AuthModule {}
