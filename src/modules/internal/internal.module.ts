import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalApiKeyGuard } from './infrastructure/guards/internal-api-key.guard';
import { InsightModule } from '../insight/insight.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { InternalPortfolioFacade } from './application/facades/internal-portfolio.facade';

@Module({
    imports: [InsightModule, PortfolioModule],
    controllers: [InternalController],
    providers: [InternalApiKeyGuard, InternalPortfolioFacade],
    exports: [InternalApiKeyGuard],
})
export class InternalModule {}
