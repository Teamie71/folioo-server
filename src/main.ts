import './instrument';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { initializeTransactionalContext } from 'typeorm-transactional';
import cookieParser from 'cookie-parser';
import expressBasicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

async function bootstrap() {
    initializeTransactionalContext();
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const configService = app.get(ConfigService);
    const corsOriginsString = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
    const corsOrigins = corsOriginsString
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });

    app.use(cookieParser());

    // Admin Basic Auth — 환경변수 미설정 시 /admin 경로 차단
    const adminUser = configService.get<string>('ADMIN_USER');
    const adminPassword = configService.get<string>('ADMIN_PASSWORD');
    if (adminUser && adminPassword) {
        app.use(
            ['/admin'],
            expressBasicAuth({
                challenge: true,
                realm: 'Folioo Admin',
                users: { [adminUser]: adminPassword },
            })
        );
    } else {
        const logger = new Logger('Bootstrap');
        logger.warn('ADMIN_USER/ADMIN_PASSWORD not set — /admin routes are blocked');
        app.use(
            '/admin',
            (
                _req: unknown,
                res: { status: (code: number) => { json: (body: unknown) => void } }
            ) => {
                res.status(403).json({ message: 'Admin is not configured' });
            }
        );
    }

    // Admin 정적 파일 서빙 (React SPA — src/ 밖에 위치하여 SWC 컴파일 방지)
    app.useStaticAssets(join(__dirname, '..', 'admin-client', 'assets'), {
        prefix: '/admin/assets/',
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    await setupSwagger(app);
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
