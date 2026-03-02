import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMBEDDING_SERVICE } from './embedding.interface';
import { OpenRouterStrategy } from './strategies/open-router.strategy';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: EMBEDDING_SERVICE,
            useClass: OpenRouterStrategy,
        },
    ],
    // 토큰 요청 시 로직을 주입한다.
    exports: [EMBEDDING_SERVICE],
})
export class EmbeddingModule {}
