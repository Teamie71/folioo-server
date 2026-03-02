import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalApiKeyGuard } from './infrastructure/guards/internal-api-key.guard';

@Module({
    controllers: [InternalController],
    providers: [InternalApiKeyGuard],
})
export class InternalModule {}
