import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ClaimEventRewardResDTO } from '../dtos/event.dto';
import { EventService } from '../services/event.service';
import { EventParticipationService } from '../services/event-participation.service';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { isSameSeoulDate } from '../../../../common/utils/seoul-date.util';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketGrantSourceType } from 'src/modules/ticket/domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { TicketGrantActorType } from 'src/modules/ticket/domain/enums/ticket-grant-actor-type.enum';

const INSIGHT_LOG_CHALLENGE_EVENT_CODE = 'INSIGHT_LOG_CHALLENGE';
const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class EventRewardLifecycleFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

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
        await this.ticketGrantFacade.issueGrantAndTickets({
            userId,
            rewards: event.rewardConfig,
            grantSourceType: TicketGrantSourceType.EVENT,
            issueContext: {
                source: TicketSource.EVENT,
                eventParticipationId: savedParticipation.id,
            },
            actorType: TicketGrantActorType.SYSTEM,
            actorId: 'self-claim',
            sourceRefId: savedParticipation.id,
            reasonCode: 'event_self_claim',
            reasonText: '챌린지 보상 직접 수령',
            grantedAt: now,
        });

        const dto = new ClaimEventRewardResDTO();
        dto.eventCode = event.code;
        dto.rewardStatus = savedParticipation.rewardStatus;
        dto.rewardGrantedAt = now.toISOString();
        return dto;
    }

    @Transactional()
    async grantSignUpReward(userId: number): Promise<void> {
        const activeSignupEvent = await this.eventService.findSignUpEvent();
        if (!activeSignupEvent) {
            return;
        }
        const participation = await this.getOrCreateParticipationForUpdate(
            userId,
            activeSignupEvent.id
        );
        if (participation.rewardStatus === EventRewardStatus.GRANTED) {
            return;
        }
        const now = new Date();
        const rewardSummary = this.ticketGrantFacade.formatRewardSummary(
            activeSignupEvent.rewardConfig
        );

        await this.ticketGrantFacade.issueGrantAndTickets({
            userId,
            rewards: activeSignupEvent.rewardConfig,
            grantSourceType: TicketGrantSourceType.SIGNUP,
            issueContext: {
                source: TicketSource.EVENT,
                eventParticipationId: participation.id,
            },
            actorType: TicketGrantActorType.SYSTEM,
            actorId: 'signup-reward',
            sourceRefId: participation.id,
            reasonCode: 'signup_reward',
            reasonText: activeSignupEvent.title,
            expiredAt: activeSignupEvent.endDate,
            grantedAt: now,
            notice: this.ticketGrantFacade.createDefaultNotice({
                title: '환영합니다!',
                rewardSummary,
                displayReason: activeSignupEvent.title,
                ctaText: activeSignupEvent.ctaText,
                ctaLink: activeSignupEvent.ctaLink ?? null,
                rewards: activeSignupEvent.rewardConfig,
                expiresAt: activeSignupEvent.endDate,
            }),
        });
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        await this.eventParticipationService.save(participation);
    }

    @Transactional()
    async getOrCreateParticipationForUpdate(
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

    private isUniqueViolation(error: unknown): boolean {
        if (typeof error !== 'object' || error === null || !('driverError' in error)) {
            return false;
        }

        const driverError = (error as { driverError?: unknown }).driverError;
        if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
            return false;
        }

        return typeof driverError.code === 'string' && driverError.code === UNIQUE_VIOLATION_CODE;
    }
}
