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

    async findAllActivitiesByInsightIds(insightIds: number[]): Promise<InsightActivity[]> {
        if (!insightIds || insightIds.length === 0) {
            return [];
        }

        return await this.mappingRepository.find({
            relations: ['insight', 'activity'],
            select: {
                insight: {
                    id: true,
                },
                activity: {
                    id: true,
                    name: true,
                },
            },
            where: {
                insight: {
                    id: In(insightIds),
                },
            },
        });
    }

    async findAllActivitiesByInsightId(insightId: number): Promise<InsightActivity[]> {
        return await this.mappingRepository.find({
            relations: ['activity'],
            select: {
                activity: {
                    id: true,
                    name: true,
                },
            },
            where: {
                insight: { id: insightId },
            },
        });
    }

    async findAllInsightIdByActivityId(activityId: number): Promise<InsightActivity[]> {
        return await this.mappingRepository.find({
            relations: ['insight', 'activity'],
            select: {
                insight: {
                    id: true,
                },
            },
            where: {
                activity: {
                    id: activityId,
                },
            },
        });
    }

    async deleteByIds(insightId: number, ids: number[]) {
        return await this.mappingRepository.delete({
            insight: {
                id: insightId,
            },
            activity: {
                id: In(ids),
            },
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
