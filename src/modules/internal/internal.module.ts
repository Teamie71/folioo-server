import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalCorrectionController } from './presentation/internal-correction.controller';
import { InternalCorrectionResultController } from './presentation/internal-correction-result.controller';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { InsightModule } from '../insight/insight.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ExperienceModule } from '../experience/experience.module';
import { InternalPortfolioFacade } from './application/facades/internal-portfolio.facade';
import { PortfolioCorrectionModule } from '../portfolio-correction/portfolio-correction.module';

@Module({
    imports: [InsightModule, PortfolioModule, PortfolioCorrectionModule, ExperienceModule],
    controllers: [
        InternalController,
        InternalCorrectionController,
        InternalCorrectionResultController,
    ],
    providers: [InternalApiKeyGuard, InternalPortfolioFacade],
})
export class InternalModule {}
