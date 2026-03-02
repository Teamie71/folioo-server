import { Module } from '@nestjs/common';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioCorrectionController } from './presentation/portfolio-correction.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';
import { PortfolioCorrection } from './domain/portfolio-correction.entity';
import { CorrectionItem } from './domain/correction-item.entity';
import { CorrectionPortfolioSelection } from './domain/correction-portfolio-selection.entity';
import { PortfolioCorrectionRepository } from './infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from './infrastructure/repositories/correction-item.repository';
import { CorrectionPortfolioSelectionRepository } from './infrastructure/repositories/correction-portfolio-selection.repository';
import { PortfolioCorrectionService } from './application/services/portfolio-correction.service';
import { CorrectionItemService } from './application/services/correction-item.service';
import { CorrectionPortfolioSelectionService } from './application/services/correction-portfolio-selection.service';
import { PdfExtractService } from './application/services/pdf-extract.service';
import { ExternalPortfolioFacade } from './application/facades/external-portfolio.facade';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { PortfolioCorrectionFacade } from './application/facades/portfolio-correction.facade';
import { TicketModule } from '../ticket/ticket.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PortfolioCorrection,
            CorrectionItem,
            CorrectionPortfolioSelection,
        ]),
        PortfolioModule,
        TicketModule,
        AiRelayModule,
    ],
    controllers: [PortfolioCorrectionController, ExternalPortfolioController],
    providers: [
        PortfolioCorrectionRepository,
        CorrectionItemRepository,
        CorrectionPortfolioSelectionRepository,
        PortfolioCorrectionService,
        CorrectionItemService,
        CorrectionPortfolioSelectionService,
        PdfExtractService,
        ExternalPortfolioFacade,
        PortfolioCorrectionFacade,
    ],
    exports: [
        PortfolioCorrectionService,
        CorrectionItemService,
        CorrectionPortfolioSelectionService,
    ],
})
export class PortfolioCorrectionModule {}
