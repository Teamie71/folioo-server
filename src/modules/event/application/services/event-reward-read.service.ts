import { Injectable } from '@nestjs/common';
import {
    EventProgressCardResDTO,
    FeedbackModalResDTO,
    FeedbackModalVariant,
} from '../dtos/event.dto';
import { EventService } from './event.service';
import { EventParticipationService } from './event-participation.service';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';

@Injectable()
export class EventRewardReadService {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService
    ) {}

    async getFeedbackModal(userId: number, eventCode: string): Promise<FeedbackModalResDTO> {
        const event = await this.eventService.findByCodeOrThrow(eventCode);
        const participation = await this.eventParticipationService.findByUserIdAndEventId(
            userId,
            event.id
        );
        const isRewarded =
            participation?.rewardStatus === EventRewardStatus.GRANTED ||
            !!participation?.rewardGrantedAt;

        const fallbackVariant = isRewarded
            ? FeedbackModalVariant.REWARDED
            : FeedbackModalVariant.REWARD_AVAILABLE;

        const dto = new FeedbackModalResDTO();
        dto.eventCode = event.code;
        dto.variant = fallbackVariant;
        dto.rewardStatus = participation?.rewardStatus ?? EventRewardStatus.NOT_GRANTED;

        const feedbackConfig = event.uiConfig?.feedbackModal;
        const fallbackTitle = isRewarded
            ? 'Folioo 사용 후기를 알려주세요!'
            : '사용 후기 남기고, 원하는 이용권 받으세요!';
        const fallbackDescription = isRewarded
            ? '피드백을 남겨주시면 더 나은 Folioo를 만드는 데 참고할게요.'
            : '첫 피드백을 남겨주시면 원하는 이용권을 지급해요.';

        dto.title = isRewarded
            ? (feedbackConfig?.rewardedTitle ?? fallbackTitle)
            : (feedbackConfig?.eligibleTitle ?? fallbackTitle);
        dto.description = isRewarded
            ? (feedbackConfig?.rewardedDescription ?? fallbackDescription)
            : (feedbackConfig?.eligibleDescription ?? fallbackDescription);

        const canSubmitAfterReward = event.opsConfig?.allowFeedbackAfterReward ?? true;
        if (isRewarded && !canSubmitAfterReward) {
            dto.ctaText = '피드백 제출 종료';
            dto.ctaLink = null;
            return dto;
        }

        dto.ctaText = feedbackConfig?.ctaText ?? event.ctaText;
        dto.ctaLink = feedbackConfig?.ctaLink ?? event.ctaLink ?? null;

        return dto;
    }

    async getProgressCard(userId: number, eventCode: string): Promise<EventProgressCardResDTO> {
        const event = await this.eventService.findByCodeOrThrow(eventCode);
        const participation = await this.eventParticipationService.findByUserIdAndEventId(
            userId,
            event.id
        );

        const target = event.goalConfig?.target ?? 1;
        const progress = Math.max(0, participation?.progress ?? 0);
        const remaining = Math.max(0, target - progress);
        const isCompleted = participation?.isCompleted ?? false;
        const rewardStatus = participation?.rewardStatus ?? EventRewardStatus.NOT_GRANTED;

        const context = {
            target: String(target),
            progress: String(progress),
            remaining: String(remaining),
        };

        const progressCard = event.uiConfig?.progressCard;

        const dto = new EventProgressCardResDTO();
        dto.eventCode = event.code;
        dto.title = this.interpolate(progressCard?.titleTemplate ?? event.title, context);
        dto.subtitle = this.interpolate(
            progressCard?.subtitleTemplate ??
                (isCompleted
                    ? '인사이트 로그 작성 챌린지 성공!'
                    : '오늘의 인사이트 로그 작성 챌린지 참여 완료!'),
            context
        );
        dto.content = this.interpolate(
            progressCard?.contentTemplate ??
                (isCompleted
                    ? '챌린지 달성 완료! 보상을 확인해보세요.'
                    : '{remaining}개의 로그를 더 작성하고 보상을 받으세요!'),
            context
        );
        dto.progress = progress;
        dto.target = target;
        dto.remaining = remaining;
        dto.isCompleted = isCompleted;
        dto.rewardStatus = rewardStatus;
        dto.ctaText =
            (isCompleted ? progressCard?.ctaCompletedText : progressCard?.ctaDefaultText) ??
            event.ctaText;
        dto.ctaLink = event.ctaLink ?? null;

        return dto;
    }

    private interpolate(template: string, variables: Record<string, string>): string {
        return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
            return variables[key] ?? full;
        });
    }
}
