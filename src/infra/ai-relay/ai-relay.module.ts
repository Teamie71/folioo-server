import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiPdfExtractPort } from 'src/common/ports/ai-pdf-extract.port';
import { AiSseRelayPort } from 'src/common/ports/ai-sse-relay.port';
import { HttpAiPdfExtractAdapter } from './http-ai-pdf-extract.adapter';
import { HttpAiSseRelayAdapter } from './http-ai-sse-relay.adapter';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [
        HttpAiSseRelayAdapter,
        {
            provide: AiSseRelayPort,
            useExisting: HttpAiSseRelayAdapter,
        },
        HttpAiPdfExtractAdapter,
        {
            provide: AiPdfExtractPort,
            useExisting: HttpAiPdfExtractAdapter,
        },
    ],
    exports: [AiSseRelayPort, AiPdfExtractPort],
})
export class AiRelayModule {}
