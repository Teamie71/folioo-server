import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { StructuredPortfolioResDTO } from '../dtos/external-portfolio.dto';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';
import { User } from 'src/modules/user/domain/user.entity';

@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async getExternalPortfolios(correctionId: number): Promise<StructuredPortfolioResDTO[]> {
        const portfolios = await this.portfolioRepository.findExternalByCorrectionId(correctionId);
        return portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
    }

    async countExternalByCorrectionId(correctionId: number): Promise<number> {
        return this.portfolioRepository.countExternalByCorrectionId(correctionId);
    }

    async createEmptyPortfolio(userId: number): Promise<Portfolio> {
        const portfolio = new Portfolio();
        portfolio.name = '';
        portfolio.description = '';
        portfolio.responsibilities = '';
        portfolio.problemSolving = '';
        portfolio.learnings = '';
        portfolio.sourceType = SourceType.EXTERNAL;
        portfolio.user = { id: userId } as User;

        return this.portfolioRepository.save(portfolio);
    }
}
