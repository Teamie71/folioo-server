import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    async save(portfolio: Portfolio): Promise<Portfolio> {
        return await this.portfolioRepository.save(portfolio);
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

    async findExternalByCorrectionId(correctionId: number): Promise<Portfolio[]> {
        return await this.portfolioRepository
            .createQueryBuilder('portfolio')
            .innerJoin('correction_item', 'ci', 'ci.portfolioId = portfolio.id')
            .where('ci.portfolioCorrectionId = :correctionId', { correctionId })
            .andWhere('portfolio.sourceType = :sourceType', { sourceType: SourceType.EXTERNAL })
            .getMany();
    }

    async countExternalByCorrectionId(correctionId: number): Promise<number> {
        return await this.portfolioRepository
            .createQueryBuilder('portfolio')
            .innerJoin('correction_item', 'ci', 'ci.portfolioId = portfolio.id')
            .where('ci.portfolioCorrectionId = :correctionId', { correctionId })
            .andWhere('portfolio.sourceType = :sourceType', { sourceType: SourceType.EXTERNAL })
            .getCount();
    }
}
