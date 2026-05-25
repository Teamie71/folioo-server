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
import { AiClientExceptionFilter } from 'src/common/filters/ai-client-exception.filter';
import { InternalCorrectionResultFacade } from './application/facades/internal-correction-result.facade';
import { InternalPdfExtractionResultController } from './presentation/internal-pdf-extraction-result.controller';
import { InternalVisualizationController } from './presentation/internal-visualization.controller';
import { InternalVisualizationFacade } from './application/facades/internal-visualization.facade';
import { InternalVisualizationSlideEventController } from './presentation/internal-visualization-slide-event.controller';
import { InternalVisualizationSlideEventFacade } from './application/facades/internal-visualization-slide-event.facade';
import { InternalVisualizationJobEventController } from './presentation/internal-visualization-job-event.controller';
import { InternalVisualizationJobEventFacade } from './application/facades/internal-visualization-job-event.facade';
import { VisualizationModule } from '../visualization/visualization.module';

@Module({
    imports: [
        InsightModule,
        PortfolioModule,
        PortfolioCorrectionModule,
        ExperienceModule,
        VisualizationModule,
    ],
    controllers: [
        InternalController,
        InternalCorrectionController,
        InternalCorrectionResultController,
        InternalPdfExtractionResultController,
        InternalVisualizationController,
        InternalVisualizationSlideEventController,
        InternalVisualizationJobEventController,
    ],
    providers: [
        InternalApiKeyGuard,
        InternalPortfolioFacade,
        AiClientExceptionFilter,
        InternalCorrectionResultFacade,
        InternalVisualizationFacade,
        InternalVisualizationSlideEventFacade,
        InternalVisualizationJobEventFacade,
    ],
})
export class InternalModule {}
