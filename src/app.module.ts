import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentryModule } from '@sentry/nestjs/setup';
import { TypeOrmConfigService } from './config/typeorm-config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { InsightModule } from './modules/insight/insight.module';
import { ExperienceModule } from './modules/experience/experience.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PortfolioCorrectionModule } from './modules/portfolio-correction/portfolio-correction.module';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';

@Module({
    imports: [
        SentryModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
            useClass: TypeOrmConfigService,
            dataSourceFactory(options) {
                if (!options) {
                    throw new Error('Invalid options passed');
                }
                return Promise.resolve(addTransactionalDataSource(new DataSource(options)));
            },
        }),
        AuthModule,
        UserModule,
        InsightModule,
        ExperienceModule,
        PortfolioModule,
        PortfolioCorrectionModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
    controllers: [AppController],
})
export class AppModule {}
