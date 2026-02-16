import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';
import { PortfolioDetailResDTO, UpdatePortfolioReqDTO } from '../dtos/portfolio.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class PortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async findByIdOrThrow(id: number, userId: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findByIdAndUserId(id, userId);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async getPortfolio(portfolioId: number, userId: number): Promise<PortfolioDetailResDTO> {
        const portfolio = await this.findByIdOrThrow(portfolioId, userId);
        return PortfolioDetailResDTO.from(portfolio);
    }

    async updatePortfolio(
        portfolioId: number,
        userId: number,
        body: UpdatePortfolioReqDTO
    ): Promise<PortfolioDetailResDTO> {
        const portfolio = await this.findByIdOrThrow(portfolioId, userId);

        if (body.name !== undefined) {
            portfolio.name = body.name;
        }
        if (body.contributionRate !== undefined) {
            portfolio.contributionRate = body.contributionRate;
        }

        const saved = await this.portfolioRepository.save(portfolio);
        return PortfolioDetailResDTO.from(saved);
    }

    async deletePortfolio(portfolioId: number, userId: number): Promise<void> {
        const portfolio = await this.findByIdOrThrow(portfolioId, userId);
        await this.portfolioRepository.deleteById(portfolio.id);
    }
}
