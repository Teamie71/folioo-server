import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import {
    ClaimEventRewardResDTO,
    EventProgressCardResDTO,
    FeedbackModalResDTO,
    FeedbackModalVariant,
    GrantFeedbackRewardReqDTO,
    GrantFeedbackRewardResDTO,
} from '../dtos/event.dto';
import { EventService } from '../services/event.service';
import { EventParticipationService } from '../services/event-participation.service';
import { EventFeedbackSubmissionService } from '../services/event-feedback-submission.service';
import { EventFeedbackSubmission } from '../../domain/entities/event-feedback-submission.entity';
import { EventFeedbackReviewStatus } from '../../domain/enums/event-feedback-review-status.enum';
import { EventFeedbackSource } from '../../domain/enums/event-feedback-source.enum';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';
import { UserService } from 'src/modules/user/application/services/user.service';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { Event } from '../../domain/entities/event.entity';
import { isSameSeoulDate } from '../utils/seoul-date.util';

const INSIGHT_LOG_CHALLENGE_EVENT_CODE = 'INSIGHT_LOG_CHALLENGE';

@Injectable()
export class EventRewardFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly eventFeedbackSubmissionService: EventFeedbackSubmissionService,
        private readonly userService: UserService,
        private readonly ticketService: TicketService
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

    @Transactional()
    async trackInsightChallengeProgress(userId: number): Promise<void> {
        const event = await this.eventService.findActiveByCode(INSIGHT_LOG_CHALLENGE_EVENT_CODE);
        if (!event || !event.goalConfig?.target) {
            return;
        }

        const participation = await this.getOrCreateParticipationForUpdate(userId, event.id);
        if (participation.isCompleted) {
            return;
        }

        const now = new Date();
        const dailyLimit = event.goalConfig.dailyLimit;
        if (
            dailyLimit === 1 &&
            participation.lastProgressedAt &&
            isSameSeoulDate(participation.lastProgressedAt, now)
        ) {
            return;
        }

        const currentProgress = participation.progress;
        const nextProgress = Math.min(event.goalConfig.target, currentProgress + 1);
        if (nextProgress === currentProgress) {
            return;
        }

        participation.progress = nextProgress;
        participation.lastProgressedAt = now;

        if (nextProgress >= event.goalConfig.target) {
            participation.isCompleted = true;
            participation.completedAt = participation.completedAt ?? now;
        }

        await this.eventParticipationService.save(participation);
    }

    @Transactional()
    async claimEventReward(userId: number, eventCode: string): Promise<ClaimEventRewardResDTO> {
        const event = await this.eventService.findActiveByCodeOrThrow(eventCode);
        if (event.opsConfig?.manualRewardOnly === true) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const participation = await this.getOrCreateParticipationForUpdate(userId, event.id);
        if (!participation.isCompleted) {
            throw new BusinessException(ErrorCode.EVENT_REWARD_NOT_CLAIMABLE);
        }

        if (
            participation.rewardStatus === EventRewardStatus.GRANTED ||
            participation.rewardGrantedAt
        ) {
            throw new BusinessException(ErrorCode.EVENT_REWARD_ALREADY_GRANTED);
        }

        const now = new Date();
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        participation.grantedBy = 'self-claim';
        participation.grantReason = '챌린지 보상 직접 수령';

        const savedParticipation = await this.eventParticipationService.save(participation);
        await this.ticketService.issueTickets(
            userId,
            {
                source: TicketSource.EVENT,
                eventParticipationId: savedParticipation.id,
            },
            event.rewardConfig
        );

        const dto = new ClaimEventRewardResDTO();
        dto.eventCode = event.code;
        dto.rewardStatus = savedParticipation.rewardStatus;
        dto.rewardGrantedAt = now.toISOString();
        return dto;
    }

    @Transactional()
    async grantFeedbackRewardByPhone(
        eventCode: string,
        body: GrantFeedbackRewardReqDTO
    ): Promise<GrantFeedbackRewardResDTO> {
        const event = await this.eventService.findActiveByCodeOrThrow(eventCode);
        if (event.opsConfig?.manualRewardOnly === false) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const normalizedPhoneNum = this.normalizePhoneNum(body.phoneNum);
        if (normalizedPhoneNum.length < 10 || normalizedPhoneNum.length > 11) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }

        const user = await this.userService.findByPhoneNumOrThrow(normalizedPhoneNum);

        if (body.externalSubmissionId) {
            const existingSubmission =
                await this.eventFeedbackSubmissionService.findByEventIdAndExternalSubmissionId(
                    event.id,
                    body.externalSubmissionId
                );
            if (existingSubmission) {
                throw new BusinessException(ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED);
            }
        } else {
            const latestSubmission =
                await this.eventFeedbackSubmissionService.findLatestByUserIdAndEventId(
                    user.id,
                    event.id
                );
            if (latestSubmission?.reviewStatus === EventFeedbackReviewStatus.REWARDED) {
                throw new BusinessException(ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED);
            }
        }

        const participation = await this.getOrCreateParticipationForUpdate(user.id, event.id);

        if (
            participation.rewardStatus === EventRewardStatus.GRANTED ||
            participation.rewardGrantedAt
        ) {
            throw new BusinessException(ErrorCode.EVENT_REWARD_ALREADY_GRANTED);
        }

        const now = new Date();

        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        participation.isCompleted = true;
        participation.completedAt = participation.completedAt ?? now;
        participation.grantedBy = body.reviewedBy ?? 'admin';
        participation.grantReason = body.reviewNote ?? null;
        const savedParticipation = await this.eventParticipationService.save(participation);

        await this.ticketService.issueTickets(
            user.id,
            {
                source: TicketSource.EVENT,
                eventParticipationId: savedParticipation.id,
            },
            event.rewardConfig
        );

        await this.recordFeedbackSubmission(
            event,
            user.id,
            normalizedPhoneNum,
            savedParticipation,
            body
        );

        const dto = new GrantFeedbackRewardResDTO();
        dto.eventCode = event.code;
        dto.userId = user.id;
        dto.maskedPhoneNum = this.maskPhoneNum(normalizedPhoneNum);
        dto.rewardStatus = savedParticipation.rewardStatus;
        dto.rewardGrantedAt = now.toISOString();
        return dto;
    }

    private async recordFeedbackSubmission(
        event: Event,
        userId: number,
        phoneNum: string,
        savedParticipation: EventParticipation,
        body: GrantFeedbackRewardReqDTO
    ): Promise<void> {
        const submission = new EventFeedbackSubmission();
        submission.eventId = event.id;
        submission.userId = userId;
        submission.phoneNum = phoneNum;
        submission.source = EventFeedbackSource.GOOGLE_FORM;
        submission.externalSubmissionId = body.externalSubmissionId ?? null;
        submission.reviewStatus = EventFeedbackReviewStatus.REWARDED;
        submission.reviewedBy = body.reviewedBy ?? 'admin';
        submission.reviewedAt = new Date();
        submission.reviewNote = body.reviewNote ?? null;
        submission.rewardedParticipationId = savedParticipation.id;
        await this.eventFeedbackSubmissionService.save(submission);
    }

    private normalizePhoneNum(phoneNum: string): string {
        return phoneNum.replace(/[^0-9]/g, '');
    }

    private maskPhoneNum(phoneNum: string): string {
        if (phoneNum.length < 7) {
            return phoneNum;
        }

        const prefix = phoneNum.slice(0, 3);
        const suffix = phoneNum.slice(-4);
        return `${prefix}****${suffix}`;
    }

    private interpolate(template: string, variables: Record<string, string>): string {
        return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
            return variables[key] ?? full;
        });
    }

    private isUniqueViolation(error: unknown): boolean {
        if (typeof error !== 'object' || error === null || !('driverError' in error)) {
            return false;
        }

        const driverError = (error as { driverError?: unknown }).driverError;
        if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
            return false;
        }

        return typeof driverError.code === 'string' && driverError.code === '23505';
    }

    private async getOrCreateParticipationForUpdate(
        userId: number,
        eventId: number
    ): Promise<EventParticipation> {
        let participation = await this.eventParticipationService.findByUserIdAndEventIdForUpdate(
            userId,
            eventId
        );

        if (!participation) {
            try {
                participation = await this.eventParticipationService.create(userId, eventId);
            } catch (error) {
                if (!this.isUniqueViolation(error)) {
                    throw error;
                }

                participation =
                    await this.eventParticipationService.findByUserIdAndEventIdForUpdate(
                        userId,
                        eventId
                    );
            }
        }

        if (!participation) {
            throw new BusinessException(ErrorCode.EVENT_PARTICIPATION_NOT_FOUND);
        }

        return participation;
    }
}
