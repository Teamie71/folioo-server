import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioCorrectionController } from './presentation/portfolio-correction.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';
import { PortfolioCorrection } from './domain/portfolio-correction.entity';
import { CorrectionItem } from './domain/correction-item.entity';
import { PortfolioCorrectionRepository } from './infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from './infrastructure/repositories/correction-item.repository';
import { PortfolioCorrectionService } from './application/services/portfolio-correction.service';
import { CorrectionItemService } from './application/services/correction-item.service';
import { ExternalPortfolioFacade } from './application/facades/external-portfolio.facade';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { UserModule } from '../user/user.module';
import { PortfolioCorrectionFacade } from './application/facades/portfolio-correction.facade';

@Module({
    imports: [
        TypeOrmModule.forFeature([PortfolioCorrection, CorrectionItem]),
        PortfolioModule,
        UserModule,
    ],
    controllers: [PortfolioCorrectionController, ExternalPortfolioController],
    providers: [
        PortfolioCorrectionRepository,
        CorrectionItemRepository,
        PortfolioCorrectionService,
        CorrectionItemService,
        ExternalPortfolioFacade,
        PortfolioCorrectionFacade,
    ],
    exports: [PortfolioCorrectionService, CorrectionItemService],
})
export class PortfolioCorrectionModule {}
