import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';

@Injectable()
export class PortfolioCorrectionRepository {
    constructor(
        @InjectRepository(PortfolioCorrection)
        private readonly portfolioCorrectionRepository: Repository<PortfolioCorrection>
    ) {}

    async findById(id: number): Promise<PortfolioCorrection | null> {
        return this.portfolioCorrectionRepository.findOne({
            where: { id },
        });
    }
}
