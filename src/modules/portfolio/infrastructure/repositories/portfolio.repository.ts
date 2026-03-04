import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';

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

    async findByIdWithExperience(id: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: { id },
            relations: { experience: true, user: true },
        });
    }

    async findByIdAndUserId(id: number, userId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: { id, user: { id: userId } },
            relations: { experience: true },
        });
    }

    async findExternalById(portfolioId: number): Promise<Portfolio | null> {
        return this.portfolioRepository.findOne({
            where: {
                id: portfolioId,
                sourceType: SourceType.EXTERNAL,
            },
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

    async findExternalByIdsAndUserId(ids: number[], userId: number): Promise<Portfolio[]> {
        if (ids.length === 0) return [];
        return this.portfolioRepository.find({
            where: {
                id: In(ids),
                sourceType: SourceType.EXTERNAL,
                user: { id: userId },
            },
        });
    }

    async deleteById(portfolioId: number): Promise<void> {
        await this.portfolioRepository.delete(portfolioId);
    }
}
