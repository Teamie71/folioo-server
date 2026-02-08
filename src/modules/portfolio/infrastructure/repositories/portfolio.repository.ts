import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';

type ExternalPortfolioUpdateValues = {
    name?: string;
    description?: string;
    responsibilities?: string;
    problemSolving?: string;
    learnings?: string;
};

@Injectable()
export class PortfolioRepository {
    constructor(
        @InjectRepository(Portfolio)
        private readonly portfolioRepository: Repository<Portfolio>
    ) {}

    save(portfolio: Portfolio): Promise<Portfolio> {
        return this.portfolioRepository.save(portfolio);
    }

    async findById(id: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: { id },
        });
    }

    async findByIdAndUserId(id: number, userId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: { id, user: { id: userId } },
            relations: { experience: true },
        });
    }

    async findExternalByIds(ids: number[]): Promise<Portfolio[]> {
        if (ids.length === 0) return [];
        return this.portfolioRepository.find({
            where: {
                id: In(ids),
                sourceType: SourceType.EXTERNAL,
            },
        });
    }

    async updateExternalPortfolio(
        portfolioId: number,
        update: ExternalPortfolioUpdateValues
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
        await this.portfolioRepository.delete(portfolioId);
    }

    private async findExternalByIdOrThrow(portfolioId: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findOne({
            where: {
                id: portfolioId,
                sourceType: SourceType.EXTERNAL,
            },
        });
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
    }
}
