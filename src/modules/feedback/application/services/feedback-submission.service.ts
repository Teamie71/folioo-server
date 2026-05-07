import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Event } from 'src/modules/event/domain/entities/event.entity';
import { EventParticipation } from 'src/modules/event/domain/entities/event-participation.entity';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { FeedbackResponse } from '../../domain/entities/feedback-response.entity';
import { FeedbackResponseRepository } from '../../infrastructure/repositories/feedback-response.repository';

@Injectable()
export class FeedbackSubmissionService {
    constructor(private readonly feedbackResponseRepository: FeedbackResponseRepository) {}

    async isRewardCooldownElapsedForParticipation(participationId: number): Promise<boolean> {
        const lastSubmittedAt =
            await this.feedbackResponseRepository.findLatestSubmittedAtByParticipationId(
                participationId
            );
        return this.isRewardCooldownElapsed(lastSubmittedAt, new Date());
    }

    isRewardCooldownElapsed(lastSubmittedAt: Date | null, now: Date): boolean {
        if (lastSubmittedAt == null) {
            return true;
        }
        return (
            DateTime.fromJSDate(lastSubmittedAt, { zone: 'utc' }).plus({
                days: FeedbackResponse.REWARD_COOLDOWN_DAYS,
            }) <= DateTime.fromJSDate(now, { zone: 'utc' })
        );
    }

    /**
     * opsConfig.allowMultipleRewards가 명시적으로 false일 때, 이미 보상을 받은 참여면 추가 티켓 지급을 하지 않는다.
     */
    shouldSuppressTicketGrantForSubmit(event: Event, participation: EventParticipation): boolean {
        if (event.opsConfig?.allowMultipleRewards !== false) {
            return false;
        }
        return (
            participation.rewardStatus === EventRewardStatus.GRANTED ||
            participation.rewardGrantedAt != null
        );
    }
}
