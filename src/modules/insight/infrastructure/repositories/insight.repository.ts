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

    async findSimilarInsights(
        userId: number,
        embedding: number[],
        limit: number
    ): Promise<Insight[]> {
        const embeddingString = `[${embedding.join(',')}]`;
        return await this.insightRepository
            .createQueryBuilder('insight')
            .where('insight.user = :userId', { userId })
            .andWhere('insight.embedding <=> :embedding < 0.7')
            // <=> : 코사인 거리(Cosine Distance). 0에 가까울수록 유사함.
            .orderBy('insight.embedding <=> :embedding', 'ASC')
            .setParameters({ embedding: embeddingString })
            .limit(limit)
            .getMany();
    }

    async existsByTitleAndUser(title: string, userId: number): Promise<boolean> {
        return await this.insightRepository.existsBy({
            title: title,
            user: {
                id: userId,
            },
        });
    }

    async countByUser(userId: number) {
        return await this.insightRepository.countBy({
            user: {
                id: userId,
            },
        });
    }

    async deleteById(id: number): Promise<void> {
        await this.insightRepository.delete({
            id: id,
        });
    }
}
