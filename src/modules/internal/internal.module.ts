import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalApiKeyGuard } from './infrastructure/guards/internal-api-key.guard';
import { InsightModule } from '../insight/insight.module';

@Module({
    imports: [InsightModule],
    controllers: [InternalController],
    providers: [InternalApiKeyGuard],
    exports: [InternalApiKeyGuard],
})
export class InternalModule {}
