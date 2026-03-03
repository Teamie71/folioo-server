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
        const qb = this.insightRepository.createQueryBuilder('insight');
        // 1. 유저 필터
        qb.where('insight.user = :userId', { userId });
        // 2. 카테고리 필터
        if (category) {
            qb.andWhere('insight.category = :category', { category });
        }
        // 3. 활동 ID 필터
        if (insightIds !== undefined) {
            if (insightIds.length === 0) return [];
            qb.andWhere('insight.id IN (:...insightIds)', { insightIds });
        }
        // 4. 키워드 검색
        if (keyword) {
            qb.andWhere('(insight.title ILIKE :keyword OR insight.description ILIKE :keyword)', {
                keyword: `%${keyword}%`,
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
    ): Promise<Array<{ insight: Insight; similarityScore: number }>> {
        const embeddingString = `[${embedding.join(',')}]`;
        const queryBuilder = this.insightRepository
            .createQueryBuilder('insight')
            .where('insight.user = :userId', { userId })
            .andWhere('insight.embedding <=> :embedding <= :threshold', { threshold })
            .addSelect('insight.embedding <=> :embedding', 'cosineDistance')
            // <=> : 코사인 거리(Cosine Distance). 0에 가까울수록 유사함.
            .orderBy('insight.embedding <=> :embedding', 'ASC')
            .setParameters({ embedding: embeddingString })
            .limit(limit);

        const { entities, raw } = await queryBuilder.getRawAndEntities();
        return entities.map((insight, index) => ({
            insight,
            similarityScore: this.distanceToSimilarity(
                Number((raw?.[index] as { cosineDistance?: number })?.cosineDistance ?? 0)
            ),
        }));
    }

    private distanceToSimilarity(distance: number): number {
        const similarity = 1 - distance;
        if (Number.isNaN(similarity)) {
            return 0;
        }
        return Math.max(-1, Math.min(1, similarity));
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
