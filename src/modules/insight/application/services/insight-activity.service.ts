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

    async findActivitiesByInsight(insightId: number): Promise<string[]> {
        return (await this.insightActivityRepository.findAllActivitiesByInsightId(insightId)).map(
            (r) => r.activity.name
        );
    }

    async deleteAllByInsightId(insightId: number): Promise<void> {
        await this.insightActivityRepository.deleteAllByInsightId(insightId);
    }
}
