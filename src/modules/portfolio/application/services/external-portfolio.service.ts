import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';

@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async getExternalPortfolios(portfolioIds: number[]): Promise<Portfolio[]> {
        return this.portfolioRepository.findExternalByIds(portfolioIds);
    }

    async createEmptyPortfolio(userId: number): Promise<Portfolio> {
        const portfolio = Portfolio.createExternal(userId);
        return this.portfolioRepository.save(portfolio);
    }
}
