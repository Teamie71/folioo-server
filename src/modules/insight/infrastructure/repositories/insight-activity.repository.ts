import { Injectable } from '@nestjs/common';
import { InsightActivity } from '../../domain/entities/insight-activity.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class InsightActivityRepository {
    constructor(
        @InjectRepository(InsightActivity)
        private readonly mappingRepository: Repository<InsightActivity>
    ) {}

    async saveAllByIds(insightId: number, activityIds: number[]) {
        const insightActivities = activityIds.map((id) => {
            return this.mappingRepository.create({
                insight: { id: insightId },
                activity: { id: id },
            });
        });
        await this.mappingRepository.save(insightActivities);
    }

    async findAllActivityIdsByInsightId(insightId: number): Promise<InsightActivity[]> {
        return await this.mappingRepository.find({
            relations: ['activity'],
            select: {
                activity: {
                    id: true,
                },
            },
            where: {
                insight: { id: insightId },
            },
        });
    }

    async deleteByIds(ids: number[]) {
        return await this.mappingRepository.delete({
            id: In(ids),
        });
    }

    async deleteAllByInsightId(insightId: number) {
        return await this.mappingRepository.delete({
            insight: {
                id: insightId,
            },
        });
    }
}
