import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { BaseResponseInterceptor } from './common/interceptors/base-response.interceptor';
import { createSwaggerConfig } from './config/swagger.config';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // app.get(ConfigService)를 하려면 먼저 ConfigService를 가져와야 합니다.
    const configService = app.get(ConfigService);

    app.use(cookieParser());
    app.useGlobalInterceptors(new BaseResponseInterceptor());

    // CORS
    app.enableCors({
        origin: [
            configService.get<string>('CLIENT_ORIGIN') ?? 'http://localhost:3000',
            'http://localhost:3000',
        ],
        credentials: true,
    });

    // Swagger 설정
    const config = createSwaggerConfig(configService);
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, doc); // 'docs' 경로로 접속

    await app.listen(Number(configService.get('PORT') ?? 8000));
}
bootstrap();
