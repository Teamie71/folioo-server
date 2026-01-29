import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './presentation/portfolio.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';
import { Portfolio } from './domain/portfolio.entity';
import { PortfolioRepository } from './infrastructure/repositories/portfolio.repository';
import { ExternalPortfolioService } from './application/services/external-portfolio.service';
import { PortfolioCorrection } from '../portfolio-correction/domain/portfolio-correction.entity';
import { CorrectionItem } from '../portfolio-correction/domain/correction-item.entity';
import { PortfolioCorrectionRepository } from '../portfolio-correction/infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from '../portfolio-correction/infrastructure/repositories/correction-item.repository';

@Module({
    imports: [TypeOrmModule.forFeature([Portfolio, PortfolioCorrection, CorrectionItem])],
    controllers: [PortfolioController, ExternalPortfolioController],
    providers: [
        PortfolioRepository,
        PortfolioCorrectionRepository,
        CorrectionItemRepository,
        ExternalPortfolioService,
    ],
})
export class PortfolioModule {}
