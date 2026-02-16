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

    save(correction: PortfolioCorrection): Promise<PortfolioCorrection> {
        return this.portfolioCorrectionRepository.save(correction);
    }

    async deleteById(id: number): Promise<void> {
        await this.portfolioCorrectionRepository.delete(id);
    }

    async findById(id: number): Promise<PortfolioCorrection | null> {
        return this.portfolioCorrectionRepository.findOne({
            where: { id },
        });
    }

    async findByIdAndUserId(id: number, userId: number): Promise<PortfolioCorrection | null> {
        return this.portfolioCorrectionRepository.findOne({
            where: { id, user: { id: userId } },
        });
    }

    countByUserId(userId: number): Promise<number> {
        return this.portfolioCorrectionRepository.count({
            where: { user: { id: userId } },
        });
    }

    async findAllByUserIdAndTitleKeyword(
        userId: number,
        keyword?: string
    ): Promise<PortfolioCorrection[]> {
        const qb = this.portfolioCorrectionRepository
            .createQueryBuilder('pc')
            .where('pc.userId = :userId', { userId })
            .orderBy('pc.createdAt', 'DESC');

        const trimmedKeyword = keyword?.trim();
        if (trimmedKeyword) {
            qb.andWhere('pc.title ILIKE :keyword', { keyword: `%${trimmedKeyword}%` });
        }

        return qb.getMany();
    }
}
