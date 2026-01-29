import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class PortfolioCorrectionRepository {
    constructor(
        @InjectRepository(PortfolioCorrection)
        private readonly portfolioCorrectionRepository: Repository<PortfolioCorrection>
    ) {}

    async findByIdOrThrow(id: number): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findOne({
            where: { id },
        });
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }
}
