import { Module } from '@nestjs/common';
import { InternalController } from './presentation/internal.controller';
import { InternalCorrectionController } from './presentation/internal-correction.controller';
import { InternalCorrectionResultController } from './presentation/internal-correction-result.controller';
import { AiCorrectionCompatController } from './presentation/ai-correction-compat.controller';
import { AiPortfolioCompatController } from './presentation/ai-portfolio-compat.controller';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { InsightModule } from '../insight/insight.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ExperienceModule } from '../experience/experience.module';
import { InternalPortfolioFacade } from './application/facades/internal-portfolio.facade';
import { PortfolioCorrectionModule } from '../portfolio-correction/portfolio-correction.module';
import { AiClientExceptionFilter } from 'src/common/filters/ai-client-exception.filter';
import { AiCorrectionCompatService } from './application/services/ai-correction-compat.service';

@Module({
    imports: [InsightModule, PortfolioModule, PortfolioCorrectionModule, ExperienceModule],
    controllers: [
        InternalController,
        InternalCorrectionController,
        InternalCorrectionResultController,
        AiCorrectionCompatController,
        AiPortfolioCompatController,
    ],
    providers: [
        InternalApiKeyGuard,
        InternalPortfolioFacade,
        AiClientExceptionFilter,
        AiCorrectionCompatService,
    ],
})
export class InternalModule {}
