import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
    constructor(private readonly configService: ConfigService) {}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        const profile = this.configService.get<string>('APP_PROFILE', 'local');
        const isLocal = profile === 'local';
        const isProd = profile === 'prod';
        const supabaseOptions = isLocal ? null : this.resolveRequiredSupabaseOptions(profile);

        return {
            type: 'postgres',
            host: supabaseOptions?.host ?? this.configService.get<string>('DB_HOST'),
            port:
                supabaseOptions?.port ?? Number(this.configService.get<string>('DB_PORT') ?? 5432),
            username: supabaseOptions?.username ?? this.configService.get<string>('DB_USERNAME'),
            password: supabaseOptions?.password ?? this.configService.get<string>('DB_PASSWORD'),
            database: supabaseOptions?.database ?? this.configService.get<string>('DB_SCHEMA'),
            autoLoadEntities: true,
            synchronize: !isProd,
            logging: !isProd ? ['error', 'query'] : false,
            namingStrategy: new SnakeNamingStrategy(),
        };
    }

    private resolveRequiredSupabaseOptions(
        profile: string
    ): { host: string; port: number; username: string; password: string; database: string } | null {
        const supabaseDbUrl = this.configService.get<string>('SUPABASE_DB_URL');
        if (!supabaseDbUrl) {
            throw new Error(
                `${profile} profile requires SUPABASE_DB_URL. ` +
                    'Direct DB_HOST fallback is disabled for non-local environments.'
            );
        }

        try {
            const parsed = new URL(supabaseDbUrl);
            const databasePath = parsed.pathname.replace(/^\//, '');

            if (!parsed.hostname || !databasePath || !parsed.username || !parsed.password) {
                throw new Error(
                    `${profile} profile has invalid SUPABASE_DB_URL. ` +
                        'Host, username, password, and database path are required.'
                );
            }

            return {
                host: parsed.hostname,
                port: Number(parsed.port || 5432),
                username: decodeURIComponent(parsed.username),
                password: decodeURIComponent(parsed.password),
                database: databasePath,
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`${profile} profile has invalid SUPABASE_DB_URL format.`);
        }
    }
}
