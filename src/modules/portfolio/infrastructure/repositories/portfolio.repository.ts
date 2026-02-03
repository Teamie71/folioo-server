import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class PortfolioRepository {
    constructor(
        @InjectRepository(Portfolio)
        private readonly portfolioRepository: Repository<Portfolio>
    ) {}

    save(portfolio: Portfolio): Promise<Portfolio> {
        return this.portfolioRepository.save(portfolio);
    }

    async findByIdOrThrow(id: number): Promise<Portfolio> {
        const portfolio = await this.portfolioRepository.findOne({
            where: { id },
        });
        if (!portfolio) {
            throw new BusinessException(ErrorCode.PORTFOLIO_NOT_FOUND);
        }
        return portfolio;
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
}
