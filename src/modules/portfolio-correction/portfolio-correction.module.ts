import { Module } from '@nestjs/common';
import { PortfolioCorrectionController } from './presentation/portfolio-correction.controller';

@Module({
    imports: [],
    controllers: [PortfolioCorrectionController],
})
export class PortfolioCorrectionModule {}
