import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './presentation/portfolio.controller';
import { Portfolio } from './domain/portfolio.entity';
import { PortfolioRepository } from './infrastructure/repositories/portfolio.repository';
import { ExternalPortfolioService } from './application/services/external-portfolio.service';

@Module({
    imports: [TypeOrmModule.forFeature([Portfolio])],
    controllers: [PortfolioController],
    providers: [PortfolioRepository, ExternalPortfolioService],
    exports: [ExternalPortfolioService],
})
export class PortfolioModule {}
