import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Insight } from '../../domain/entities/insight.entity';
import { Repository } from 'typeorm';
import { InsightCategory } from '../../domain/enums/insight-category.enum';

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

    async search(
        userId: number,
        keyword?: string,
        category?: InsightCategory,
        insightIds?: number[]
    ) {
        const qb = this.insightRepository
            .createQueryBuilder('insight')
            .where('insight.user = :userId', { userId });

        // 1. 카테고리 (단순 일치)
        if (category) {
            qb.andWhere('insight.category = :category', { category });
        }

        // 2. 활동 ID 필터 (활동 쪽에서 받아온 ID들로 IN 절 처리)
        if (insightIds) {
            if (insightIds.length === 0) return [];
            qb.andWhere('insight.id IN (:...insightIds)', { insightIds });
        }

        // 3. 키워드 검색
        if (keyword) {
            qb.andWhere((subQb) => {
                subQb
                    .where('insight.title ILIKE :keyword', { keyword: `%${keyword}%` })
                    .orWhere('insight.description ILIKE :keyword', { keyword: `%${keyword}%` });
            });
        }

        return await qb.orderBy('insight.createdAt', 'DESC').getMany();
    }

    async findAllByUserWithSimpleInfo(userId: number) {
        return await this.insightRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
        });
    }

    async findSimilarInsights(
        userId: number,
        embedding: number[],
        threshold: number,
        limit: number
    ): Promise<Insight[]> {
        const embeddingString = `[${embedding.join(',')}]`;
        return await this.insightRepository
            .createQueryBuilder('insight')
            .where('insight.user = :userId', { userId })
            .andWhere('insight.embedding <=> :embedding <= :threshold', { threshold })
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
