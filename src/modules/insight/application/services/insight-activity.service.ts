import { Injectable } from '@nestjs/common';
import { InsightActivityRepository } from '../../infrastructure/repositories/insight-activity.repository';

@Injectable()
export class InsightActivityService {
    constructor(private readonly insightActivityRepository: InsightActivityRepository) {}

    async compareAndReplaceByIds(insightId: number, activityIds: number[]): Promise<void> {
        const currentMapping =
            await this.insightActivityRepository.findAllActivitiesByInsightId(insightId);
        const currentIds = currentMapping.map((r) => r.activity.id);
        const toDeleteIds = currentIds.filter((id) => !activityIds.includes(id));
        const toAddIds = activityIds.filter((id) => !currentIds.includes(id));

        if (toDeleteIds.length > 0) {
            await this.insightActivityRepository.deleteByIds(insightId, toDeleteIds);
        }
        if (toAddIds.length > 0) {
            await this.insightActivityRepository.saveAllByIds(insightId, toAddIds);
        }
    }

    async saveAllByIds(insightId: number, activityIds: number[]) {
        if (activityIds.length > 0) {
            await this.insightActivityRepository.saveAllByIds(insightId, activityIds);
        }
    }

    async getNamesByInsightIds(insightIds: number[]): Promise<Record<number, string[]>> {
        if (!insightIds || insightIds.length === 0) return {};

        // 1. IN 쿼리로 한 번에 긁어오기
        const mappingData =
            await this.insightActivityRepository.findAllActivitiesByInsightIds(insightIds);

        // 2. insightId를 키(Key)로, 활동명 배열을 값(Value)으로 하는 Map 객체 생성
        const activitiesMap: Record<number, string[]> = {};

        mappingData.forEach((mapping) => {
            const insightId = mapping.insight.id;
            const activityName = mapping.activity.name;

            if (!activitiesMap[insightId]) {
                activitiesMap[insightId] = [];
            }
            activitiesMap[insightId].push(activityName);
        });

        return activitiesMap;
    }

    async findActivitiesByInsight(insightId: number): Promise<string[]> {
        return (await this.insightActivityRepository.findAllActivitiesByInsightId(insightId)).map(
            (r) => r.activity.name
        );
    }

    async findInsightIdsByActivityId(activityId: number): Promise<number[]> {
        return (await this.insightActivityRepository.findAllInsightIdByActivityId(activityId)).map(
            (r) => r.insight.id
        );
    }

    async deleteAllByInsightId(insightId: number): Promise<void> {
        await this.insightActivityRepository.deleteAllByInsightId(insightId);
    }

    async deleteAllByActivityId(activityId: number): Promise<void> {
        await this.insightActivityRepository.deleteAllByActivityId(activityId);
    }
}
