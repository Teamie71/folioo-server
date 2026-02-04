import { Injectable } from '@nestjs/common';
import { InsightActivityRepository } from '../../infrastructure/repositories/insight-activity.repository';

@Injectable()
export class InsightActivityService {
    constructor(private readonly insightActivityRepository: InsightActivityRepository) {}

    async compareAndReplaceByIds(insightId: number, activityIds: number[]): Promise<void> {
        const currentMapping =
            await this.insightActivityRepository.findAllActivityIdsByInsightId(insightId);
        const currentIds = currentMapping.map((r) => r.activity.id);
        const toDeleteIds = currentIds.filter((id) => !activityIds.includes(id));
        const toAddIds = activityIds.filter((id) => !currentIds.includes(id));

        await this.insightActivityRepository.deleteByIds(toDeleteIds);
        await this.insightActivityRepository.saveAllByIds(insightId, toAddIds);
    }

    async findAcitivityIdsByInsight(insightId: number): Promise<number[]> {
        return (await this.insightActivityRepository.findAllActivityIdsByInsightId(insightId)).map(
            (r) => r.activity.id
        );
    }
}
