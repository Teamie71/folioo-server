import { Module } from '@nestjs/common';
import { PortfolioController } from './presentation/portfolio.controller';

@Module({
    imports: [],
    controllers: [PortfolioController],
})
export class PortfolioModule {}
