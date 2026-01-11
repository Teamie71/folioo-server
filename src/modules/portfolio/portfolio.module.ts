import { Module } from '@nestjs/common';
import { PortfolioController } from './presentation/portfolio.controller';
import { ExternalPortfolioController } from './presentation/external-portfolio.controller';

@Module({
    imports: [],
    controllers: [PortfolioController, ExternalPortfolioController],
})
export class PortfolioModule {}
