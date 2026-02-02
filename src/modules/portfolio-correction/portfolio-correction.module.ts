import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioCorrectionController } from './presentation/portfolio-correction.controller';
import { PortfolioCorrection } from './domain/portfolio-correction.entity';
import { CorrectionItem } from './domain/correction-item.entity';
import { PortfolioCorrectionRepository } from './infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from './infrastructure/repositories/correction-item.repository';
import { PortfolioCorrectionService } from './application/services/portfolio-correction.service';

@Module({
    imports: [TypeOrmModule.forFeature([PortfolioCorrection, CorrectionItem])],
    controllers: [PortfolioCorrectionController],
    providers: [
        PortfolioCorrectionRepository,
        CorrectionItemRepository,
        PortfolioCorrectionService,
    ],
    exports: [PortfolioCorrectionService],
})
export class PortfolioCorrectionModule {}
