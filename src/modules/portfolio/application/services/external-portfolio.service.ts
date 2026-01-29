import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { PortfolioRepository } from '../../infrastructure/repositories/portfolio.repository';
import { PortfolioCorrectionRepository } from 'src/modules/portfolio-correction/infrastructure/repositories/portfolio-correction.repository';
import { CorrectionItemRepository } from 'src/modules/portfolio-correction/infrastructure/repositories/correction-item.repository';
import { StructuredPortfolioResDTO } from '../dtos/external-portfolio.dto';
import { Portfolio } from '../../domain/portfolio.entity';
import { SourceType } from '../../domain/enums/source-type.enum';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from 'src/modules/user/domain/user.entity';

const MAX_EXTERNAL_PORTFOLIO_BLOCKS = 5;

@Injectable()
export class ExternalPortfolioService {
    constructor(
        private readonly portfolioRepository: PortfolioRepository,
        private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository,
        private readonly correctionItemRepository: CorrectionItemRepository
    ) {}

    async getExternalPortfolios(correctionId: number): Promise<StructuredPortfolioResDTO[]> {
        await this.portfolioCorrectionRepository.findByIdOrThrow(correctionId);

        const portfolios = await this.portfolioRepository.findExternalByCorrectionId(correctionId);

        return portfolios.map((portfolio) => StructuredPortfolioResDTO.from(portfolio));
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        const correction = await this.portfolioCorrectionRepository.findByIdOrThrow(correctionId);

        const currentCount =
            await this.portfolioRepository.countExternalByCorrectionId(correctionId);
        if (currentCount >= MAX_EXTERNAL_PORTFOLIO_BLOCKS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const portfolio = new Portfolio();
        portfolio.name = '';
        portfolio.description = '';
        portfolio.responsibilities = '';
        portfolio.problemSolving = '';
        portfolio.learnings = '';
        portfolio.sourceType = SourceType.EXTERNAL;
        portfolio.user = { id: userId } as User;

        const savedPortfolio = await this.portfolioRepository.save(portfolio);

        const correctionItem = new CorrectionItem();
        correctionItem.portfolio = savedPortfolio;
        correctionItem.portfolioCorrection = correction;

        await this.correctionItemRepository.save(correctionItem);

        return StructuredPortfolioResDTO.from(savedPortfolio);
    }
}
