import { Injectable } from '@nestjs/common';
import { CreateInsightLogReqDTO, InsightLogResDTO } from '../dtos/insight-log.dto';
import { InsightService } from '../services/insight.service';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';

@Injectable()
export class InsightFacade {
    constructor(
        private readonly insightService: InsightService,
        private readonly eventRewardFacade: EventRewardFacade
    ) {}

    async createInsight(userId: number, body: CreateInsightLogReqDTO): Promise<InsightLogResDTO> {
        const insight = await this.insightService.createInsight(userId, body);
        await this.eventRewardFacade.trackInsightChallengeProgress(userId);
        return insight;
    }
}
