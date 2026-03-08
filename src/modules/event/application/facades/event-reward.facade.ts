import { Injectable } from '@nestjs/common';
import {
    ClaimEventRewardResDTO,
    EventProgressCardResDTO,
    FeedbackModalResDTO,
} from '../dtos/event.dto';
import { EventRewardReadService } from '../services/event-reward-read.service';
import { EventRewardLifecycleService } from '../services/event-reward-lifecycle.service';

@Injectable()
export class EventRewardFacade {
    constructor(
        private readonly eventRewardReadService: EventRewardReadService,
        private readonly eventRewardLifecycleService: EventRewardLifecycleService
    ) {}

    async getFeedbackModal(userId: number, eventCode: string): Promise<FeedbackModalResDTO> {
        return this.eventRewardReadService.getFeedbackModal(userId, eventCode);
    }

    async getProgressCard(userId: number, eventCode: string): Promise<EventProgressCardResDTO> {
        return this.eventRewardReadService.getProgressCard(userId, eventCode);
    }

    async trackInsightChallengeProgress(userId: number): Promise<void> {
        await this.eventRewardLifecycleService.trackInsightChallengeProgress(userId);
    }

    async claimEventReward(userId: number, eventCode: string): Promise<ClaimEventRewardResDTO> {
        return this.eventRewardLifecycleService.claimEventReward(userId, eventCode);
    }

    async grantSignUpReward(userId: number): Promise<void> {
        await this.eventRewardLifecycleService.grantSignUpReward(userId);
    }
}
