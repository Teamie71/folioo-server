import { Module } from '@nestjs/common';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioCorrectionController } from './presentation/portfolio-correction.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';
import { PortfolioCorrection } from './domain/portfolio-correction.entity';
import { CorrectionItem } from './domain/correction-item.entity';
import { CorrectionMaterial } from './domain/correction-material.entity';
import { CorrectionRagData } from './domain/correction-rag-data.entity';
import { PortfolioCorrectionRepository } from './infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from './infrastructure/repositories/correction-item.repository';
import { CorrectionMaterialRepository } from './infrastructure/repositories/correction-material.repository';
import { CorrectionRagDataRepository } from './infrastructure/repositories/correction-rag-data.repository';
import { PortfolioCorrectionService } from './application/services/portfolio-correction.service';
import { CorrectionItemService } from './application/services/correction-item.service';
import { CorrectionMaterialService } from './application/services/correction-material.service';
import { CorrectionRagDataService } from './application/services/correction-rag-data.service';
import { PdfExtractService } from './application/services/pdf-extract.service';
import { ExternalPortfolioFacade } from './application/facades/external-portfolio.facade';
import { PortfolioCorrectionFacade } from './application/facades/portfolio-correction.facade';
import { ExternalPortfolioExtractRequestParserService } from './presentation/services/external-portfolio-extract-request-parser.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PortfolioCorrection,
            CorrectionItem,
            CorrectionMaterial,
            CorrectionRagData,
        ]),
        AiRelayModule,
    ],
    controllers: [PortfolioCorrectionController, ExternalPortfolioController],
    providers: [
        PortfolioCorrectionRepository,
        CorrectionItemRepository,
        CorrectionMaterialRepository,
        CorrectionRagDataRepository,
        PortfolioCorrectionService,
        CorrectionItemService,
        CorrectionMaterialService,
        CorrectionRagDataService,
        PdfExtractService,
        ExternalPortfolioFacade,
        PortfolioCorrectionFacade,
        ExternalPortfolioExtractRequestParserService,
    ],
    exports: [
        PortfolioCorrectionService,
        CorrectionItemService,
        CorrectionMaterialService,
        CorrectionRagDataService,
    ],
})
export class PortfolioCorrectionModule {}
