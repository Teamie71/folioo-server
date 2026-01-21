import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        const isProd = this.configService.get('APP_PROFILE') === 'prod';

        return {
            type: 'postgres',
            host: this.configService.get('DB_HOST'),
            port: +Number(this.configService.get('DB_PORT') ?? 5432),
            username: this.configService.get('DB_USERNAME'),
            password: this.configService.get('DB_PASSWORD'),
            database: this.configService.get('DB_SCHEMA'),
            autoLoadEntities: true,
            synchronize: !isProd,
            logging: !isProd ? ['error', 'query'] : false,
        };
    }
}
