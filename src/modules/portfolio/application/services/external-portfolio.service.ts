import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

export interface ExternalPortfolioUpdateInput {
    name?: string;
    description?: string;
    responsibilities?: string;
    problemSolving?: string;
    learnings?: string;
}

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

    async findExternalByIdAndUserIdOrThrow(
        portfolioId: number,
        userId: number
    ): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findExternalByIdAndUserId(
            portfolioId,
            userId
        );
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async createEmptyPortfolio(userId: number): Promise<Portfolio> {
        const portfolio = Portfolio.createExternal(userId);
        return this.portfolioRepository.save(portfolio);
    }

    async updateExternalPortfolio(
        portfolioId: number,
        userId: number,
        update: ExternalPortfolioUpdateInput
    ): Promise<Portfolio> {
        const portfolio = await this.findExternalByIdAndUserIdOrThrow(portfolioId, userId);

        if (update.name !== undefined) portfolio.name = update.name;
        if (update.description !== undefined) portfolio.description = update.description;
        if (update.responsibilities !== undefined)
            portfolio.responsibilities = update.responsibilities;
        if (update.problemSolving !== undefined) portfolio.problemSolving = update.problemSolving;
        if (update.learnings !== undefined) portfolio.learnings = update.learnings;

        return this.portfolioRepository.save(portfolio);
    }

    async deleteExternalPortfolio(portfolioId: number, userId: number): Promise<void> {
        const portfolio = await this.findExternalByIdAndUserIdOrThrow(portfolioId, userId);
        if (!this.isEmptyPortfolio(portfolio)) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_EMPTY);
        }
        await this.portfolioRepository.deleteById(portfolioId);
    }

    private isEmptyPortfolio(portfolio: Portfolio): boolean {
        return (
            !portfolio.name &&
            !portfolio.description &&
            !portfolio.responsibilities &&
            !portfolio.problemSolving &&
            !portfolio.learnings
        );
    }
}
