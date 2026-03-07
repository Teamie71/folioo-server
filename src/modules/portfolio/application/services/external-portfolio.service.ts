import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';
import { UpdatePortfolioBlockReqDTO } from 'src/modules/portfolio-correction/application/dtos/external-portfolio.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class ExternalPortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async findExternalByIdOrThrow(portfolioId: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findExternalById(portfolioId);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async getExternalPortfolios(portfolioIds: number[]): Promise<Portfolio[]> {
        return this.portfolioRepository.findExternalByIds(portfolioIds);
    }

    async getExternalPortfoliosByOwnerOrThrow(
        portfolioIds: number[],
        userId: number
    ): Promise<Portfolio[]> {
        const uniqueIds = [...new Set(portfolioIds)];
        const portfolios = await this.portfolioRepository.findExternalByIdsAndUserId(
            uniqueIds,
            userId
        );
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolios;
    }

    async getPortfoliosByOwnerOrThrow(
        portfolioIds: number[],
        userId: number
    ): Promise<Portfolio[]> {
        const uniqueIds = [...new Set(portfolioIds)];
        const portfolios = await this.portfolioRepository.findByIdsAndUserId(uniqueIds, userId);
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolios;
    }

    async getPortfolios(portfolioIds: number[]): Promise<Portfolio[]> {
        return this.portfolioRepository.findByIds(portfolioIds);
    }

    async createEmptyPortfolio(userId: number): Promise<Portfolio> {
        const portfolio = Portfolio.createExternal(userId);
        return this.portfolioRepository.save(portfolio);
    }

    async updateExternalPortfolio(
        portfolioId: number,
        update: UpdatePortfolioBlockReqDTO
    ): Promise<Portfolio> {
        const portfolio = await this.findExternalByIdOrThrow(portfolioId);

        if (update.name !== undefined) portfolio.name = update.name;
        if (update.description !== undefined) portfolio.description = update.description;
        if (update.responsibilities !== undefined)
            portfolio.responsibilities = update.responsibilities;
        if (update.problemSolving !== undefined) portfolio.problemSolving = update.problemSolving;
        if (update.learnings !== undefined) portfolio.learnings = update.learnings;

        return this.portfolioRepository.save(portfolio);
    }

    async deleteExternalPortfolio(portfolioId: number): Promise<void> {
        await this.findExternalByIdOrThrow(portfolioId);
        await this.portfolioRepository.deleteById(portfolioId);
    }

    isEmptyPortfolio(portfolio: Portfolio): boolean {
        return (
            !portfolio.name &&
            !portfolio.description &&
            !portfolio.responsibilities &&
            !portfolio.problemSolving &&
            !portfolio.learnings
        );
    }
}
