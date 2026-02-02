import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './presentation/portfolio.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';
import { Portfolio } from './domain/portfolio.entity';
import { PortfolioRepository } from './infrastructure/repositories/portfolio.repository';
import { ExternalPortfolioService } from './application/services/external-portfolio.service';
import { ExternalPortfolioFacade } from './application/facades/external-portfolio.facade';
import { PortfolioCorrectionModule } from '../portfolio-correction/portfolio-correction.module';

@Module({
    imports: [TypeOrmModule.forFeature([Portfolio]), PortfolioCorrectionModule],
    controllers: [PortfolioController, ExternalPortfolioController],
    providers: [PortfolioRepository, ExternalPortfolioService, ExternalPortfolioFacade],
})
export class PortfolioModule {}
