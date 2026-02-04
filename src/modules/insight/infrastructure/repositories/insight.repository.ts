import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Insight } from '../../domain/entities/insight.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InsightRepository {
    constructor(
        @InjectRepository(Insight)
        private readonly insightRepository: Repository<Insight>
    ) {}

    async save(insight: Insight): Promise<Insight> {
        return await this.insightRepository.save(insight);
    }

    async findById(id: number): Promise<Insight | null> {
        return await this.insightRepository.findOne({
            where: {
                id: id,
            },
            relations: ['user'],
            select: { user: { id: true } },
        });
    }

    async existsByTitleAndUser(title: string, userId: number): Promise<boolean> {
        return await this.insightRepository.existsBy({
            title: title,
            user: {
                id: userId,
            },
        });
    }
}
