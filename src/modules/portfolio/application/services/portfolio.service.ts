import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { Portfolio } from '../../domain/portfolio.entity';
import {
    PortfolioDetailResDTO,
    PortfolioListResDTO,
    UpdatePortfolioReqDTO,
} from '../dtos/portfolio.dto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PortfolioStatus } from '../../domain/enums/portfolio-status.enum';

@Injectable()
export class PortfolioService {
    constructor(private readonly portfolioRepository: PortfolioRepository) {}

    async getPortfolios(userId: number): Promise<PortfolioListResDTO[]> {
        const portfolios = await this.portfolioRepository.findAllCompletedByUserId(userId);
        return portfolios.map((portfolio) => PortfolioListResDTO.from(portfolio));
    }

    async findByIdOrThrow(id: number, userId: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findByIdAndUserId(id, userId);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }

    async savePortfolio(portfolio: Portfolio): Promise<Portfolio> {
        return this.portfolioRepository.save(portfolio);
    }

    async findByIdWithExperienceOrThrow(id: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findByIdWithExperience(id);
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
        portfolio.update(body);
        await this.portfolioRepository.save(portfolio);
        return PortfolioDetailResDTO.from(portfolio);
    }

    async deletePortfolio(portfolioId: number, userId: number): Promise<void> {
        const portfolio = await this.findByIdOrThrow(portfolioId, userId);
        await this.portfolioRepository.deleteById(portfolio.id);
    }

    async findByExperienceId(experienceId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findByExperienceId(experienceId);
    }

    async completeGeneration(
        portfolioId: number,
        content: {
            description: string;
            responsibilities: string;
            problemSolving: string;
            learnings: string;
        }
    ): Promise<void> {
        const portfolio = await this.findByIdInternalOrThrow(portfolioId);
        if (portfolio.status !== PortfolioStatus.GENERATING) {
            return;
        }
        portfolio.complete(content);
        await this.portfolioRepository.save(portfolio);
    }

    async failGeneration(portfolioId: number): Promise<void> {
        const portfolio = await this.findByIdInternalOrThrow(portfolioId);
        if (portfolio.status !== PortfolioStatus.GENERATING) {
            return;
        }
        portfolio.fail();
        await this.portfolioRepository.save(portfolio);
    }

    async removeGeneratingPortfolio(portfolioId: number): Promise<void> {
        const portfolio = await this.findByIdInternalOrThrow(portfolioId);
        if (portfolio.status !== PortfolioStatus.GENERATING) {
            return;
        }
        await this.portfolioRepository.deleteById(portfolio.id);
    }

    async findByIdsAndUserIdOrThrow(portfolioIds: number[], userId: number): Promise<Portfolio[]> {
        const uniqueIds = [...new Set(portfolioIds)];
        const portfolios = await this.portfolioRepository.findByIdsAndUserId(uniqueIds, userId);
        if (portfolios.length !== uniqueIds.length) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolios;
    }

    async findByIds(portfolioIds: number[]): Promise<Portfolio[]> {
        return this.portfolioRepository.findByIds(portfolioIds);
    }

    private async findByIdInternalOrThrow(id: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findById(id);
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }
}
