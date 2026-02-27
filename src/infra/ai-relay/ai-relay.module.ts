import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSseRelayPort } from 'src/common/ports/ai-sse-relay.port';
import { HttpAiSseRelayAdapter } from './http-ai-sse-relay.adapter';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [
        HttpAiSseRelayAdapter,
        {
            provide: AiSseRelayPort,
            useExisting: HttpAiSseRelayAdapter,
        },
    ],
    exports: [AiSseRelayPort],
})
export class AiRelayModule {}
