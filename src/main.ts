import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { initializeTransactionalContext } from 'typeorm-transactional';

async function bootstrap() {
    initializeTransactionalContext();
    const app = await NestFactory.create(AppModule);

    await setupSwagger(app);
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
