import { Injectable } from '@nestjs/common';
import { CreateInsightLogReqDTO, InsightLogResDTO } from '../dtos/insight-log.dto';
import { InsightService } from '../services/insight.service';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class InsightFacade {
    constructor(
        private readonly insightService: InsightService,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade
    ) {}

    @Transactional()
    async createInsight(userId: number, body: CreateInsightLogReqDTO): Promise<InsightLogResDTO> {
        const insight = await this.insightService.createInsight(userId, body);
        await this.eventRewardLifecycleFacade.trackInsightChallengeProgress(userId);
        return insight;
    }
}
