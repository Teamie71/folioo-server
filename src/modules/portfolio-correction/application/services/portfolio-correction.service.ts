import { Injectable } from '@nestjs/common';
import { PortfolioCorrectionRepository } from '../../infrastructure/repositories/portfolio-correction.repository';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class PortfolioCorrectionService {
    constructor(private readonly portfolioCorrectionRepository: PortfolioCorrectionRepository) {}

    async findByIdOrThrow(correctionId: number): Promise<PortfolioCorrection> {
        const correction = await this.portfolioCorrectionRepository.findById(correctionId);
        if (!correction) {
            throw new BusinessException(ErrorCode.CORRECTION_NOT_FOUND);
        }
        return correction;
    }
}
