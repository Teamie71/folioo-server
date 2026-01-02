import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import metadata from '../metadata';

export async function setupSwagger(app: INestApplication): Promise<void> {
    const configService = app.get(ConfigService);

    const config = new DocumentBuilder()
        .setTitle(configService.get<string>('SWAGGER_TITLE') || 'Folioo API docs')
        .setDescription(
            configService.get<string>('SWAGGER_DESCRIPTION') || 'API document of Folioo Devlopment'
        )
        .setVersion(configService.get<string>('SWAGGER_VERSION') || '1.0.0')
        .build();

    await SwaggerModule.loadPluginMetadata(metadata);
    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
}
