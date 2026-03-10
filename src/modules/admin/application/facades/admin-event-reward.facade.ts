import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminManualRewardEventItemResDTO,
    AdminManualRewardEventListResDTO,
    AdminUserItemResDTO,
    AdminUserSearchResDTO,
} from '../dtos/admin-event-reward.dto';
import type { GrantRewardByUserIdParams } from '../dtos/admin-event-reward.dto';
import { Transactional } from 'typeorm-transactional';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { EventFeedbackSubmissionService } from '../services/event-feedback-submission.service';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventFeedbackReviewStatus } from '../../domain/enums/event-feedback-review-status.enum';
import { EventService } from 'src/modules/event/application/services/event.service';
import { EventParticipationService } from 'src/modules/event/application/services/event-participation.service';
import { EventFeedbackSubmission } from '../../domain/entities/event-feedback-submission.entity';
import { EventFeedbackSource } from '../../domain/enums/event-feedback-source.enum';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketGrantActorType } from 'src/modules/ticket/domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from 'src/modules/ticket/domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { AdminTicketGrantListResDTO } from 'src/modules/ticket/application/dtos/ticket-grant-notice.dto';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';
import type { RewardConfigItem } from 'src/modules/event/domain/entities/event.entity';
import { Event } from 'src/modules/event/domain/entities/event.entity';

@Injectable()
export class AdminEventRewardFacade {
    constructor(
        private readonly userService: UserService,
        private readonly eventFeedbackSubmissionService: EventFeedbackSubmissionService,
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade,
        private readonly ticketService: TicketService,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

    async searchUsers(keyword?: string): Promise<AdminUserSearchResDTO> {
        const projections = await this.userService.searchUsers(keyword);
        const balanceMap = await this.ticketService.getBalanceBatch();

        const users: AdminUserItemResDTO[] = projections.map((p) => {
            const balance = balanceMap.get(p.userId) ?? { experience: 0, correction: 0 };
            const item = new AdminUserItemResDTO();
            item.userId = p.userId;
            item.name = p.name;
            item.phoneNum = p.phoneNum;
            item.isActive = p.isActive;
            item.email = p.email;
            item.loginType = p.loginType;
            item.experienceTickets = balance.experience;
            item.correctionTickets = balance.correction;
            return item;
        });

        return AdminUserSearchResDTO.from(users, users.length);
    }

    async getManualRewardEvents(userId?: number): Promise<AdminManualRewardEventListResDTO> {
        const events = await this.eventService.findAllManualRewardEvents();

        let grantedEventIds = new Set<number>();
        if (userId) {
            const eventIds = events.map((e) => e.id);
            grantedEventIds = await this.eventParticipationService.findGrantedEventIdsByUserId(
                userId,
                eventIds
            );
        }

        const items = events.map((event) => {
            const item = new AdminManualRewardEventItemResDTO();
            item.code = event.code;
            item.title = event.title;
            item.rewardConfig = event.rewardConfig;
            item.allowMultipleRewards = event.opsConfig?.allowMultipleRewards === true;
            item.isGranted = grantedEventIds.has(event.id);
            return item;
        });

        return AdminManualRewardEventListResDTO.from(items);
    }

    async grantReward(
        eventCode: string,
        body: AdminGrantRewardReqDTO
    ): Promise<AdminGrantRewardResDTO> {
        const result = await this.grantFeedbackRewardByUserId(eventCode, {
            userId: body.userId,
            externalSubmissionId: body.externalSubmissionId,
            reviewedBy: body.reviewedBy,
            reviewNote: body.reviewNote,
            customRewards: body.customRewards,
        });

        const dto = new AdminGrantRewardResDTO();
        dto.eventCode = eventCode;
        dto.userId = result.userId;
        dto.rewardStatus = result.rewardStatus;
        dto.rewardGrantedAt = result.rewardGrantedAt.toISOString();
        return dto;
    }

    async getTicketGrants(): Promise<AdminTicketGrantListResDTO> {
        return this.ticketGrantFacade.getAdminTicketGrants();
    }

    @Transactional()
    async grantFeedbackRewardByUserId(
        eventCode: string,
        params: GrantRewardByUserIdParams
    ): Promise<{ userId: number; rewardStatus: EventRewardStatus; rewardGrantedAt: Date }> {
        const event = await this.eventService.findByCodeOrThrow(eventCode);
        if (!event.isActive) {
            throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        }
        if (event.opsConfig?.manualRewardOnly !== true) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const user = await this.userService.findByIdOrThrow(params.userId);

        const allowMultiple = event.opsConfig?.allowMultipleRewards === true;

        if (params.externalSubmissionId) {
            const existingSubmission =
                await this.eventFeedbackSubmissionService.findByEventIdAndExternalSubmissionId(
                    event.id,
                    params.externalSubmissionId
                );
            if (existingSubmission) {
                throw new BusinessException(ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED);
            }
        } else if (!allowMultiple) {
            const latestSubmission =
                await this.eventFeedbackSubmissionService.findLatestByUserIdAndEventId(
                    user.id,
                    event.id
                );
            if (latestSubmission?.reviewStatus === EventFeedbackReviewStatus.REWARDED) {
                throw new BusinessException(ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED);
            }
        }

        const participation =
            await this.eventRewardLifecycleFacade.getOrCreateParticipationForUpdate(
                user.id,
                event.id
            );

        if (!allowMultiple) {
            if (
                participation.rewardStatus === EventRewardStatus.GRANTED ||
                participation.rewardGrantedAt
            ) {
                throw new BusinessException(ErrorCode.EVENT_REWARD_ALREADY_GRANTED);
            }
        }

        const now = new Date();

        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        participation.isCompleted = true;
        participation.completedAt = participation.completedAt ?? now;
        participation.grantedBy = params.reviewedBy ?? 'admin-ui';
        participation.grantReason = params.reviewNote ?? null;
        const savedParticipation = await this.eventParticipationService.save(participation);

        const rewards = this.resolveRewards(event, params.customRewards);
        const notice = this.buildNoticeFromEvent(event, rewards);

        await this.ticketGrantFacade.issueGrantAndTickets({
            userId: user.id,
            rewards,
            grantSourceType: TicketGrantSourceType.EVENT,
            issueContext: {
                source: TicketSource.EVENT,
                eventParticipationId: savedParticipation.id,
            },
            actorType: TicketGrantActorType.ADMIN,
            actorId: params.reviewedBy ?? 'admin-ui',
            sourceRefId: savedParticipation.id,
            reasonCode: 'event_feedback_reward',
            reasonText: params.reviewNote ?? null,
            notice,
            grantedAt: now,
        });

        const submission = new EventFeedbackSubmission();
        submission.eventId = event.id;
        submission.userId = user.id;
        submission.phoneNum = null;
        submission.source = EventFeedbackSource.ADMIN_UI;
        submission.externalSubmissionId = params.externalSubmissionId ?? null;
        submission.reviewStatus = EventFeedbackReviewStatus.REWARDED;
        submission.reviewedBy = params.reviewedBy ?? 'admin-ui';
        submission.reviewedAt = now;
        submission.reviewNote = params.reviewNote ?? null;
        submission.rewardedParticipationId = savedParticipation.id;
        await this.eventFeedbackSubmissionService.save(submission);

        return {
            userId: user.id,
            rewardStatus: savedParticipation.rewardStatus,
            rewardGrantedAt: now,
        };
    }

    private resolveRewards(event: Event, customRewards?: RewardConfigItem[]): RewardConfigItem[] {
        if (event.opsConfig?.allowMultipleRewards === true && customRewards?.length) {
            return customRewards;
        }
        return event.rewardConfig;
    }

    private buildNoticeFromEvent(
        event: Event,
        rewards: RewardConfigItem[]
    ): {
        title: string;
        body: string;
        ctaText: string | null;
        ctaLink: string | null;
        payload: Record<string, unknown>;
    } {
        const rewardSummary = this.ticketGrantFacade.formatRewardSummary(rewards);

        return {
            title: '보상이 지급되었어요',
            body: rewardSummary,
            ctaText: event.ctaText ?? this.resolveCtaText(rewards),
            ctaLink: event.ctaLink ?? this.resolveCtaLink(rewards),
            payload: {
                displayReason: event.title,
                rewards,
            },
        };
    }

    private resolveCtaText(rewards: RewardConfigItem[]): string {
        const hasExperience = rewards.some(
            (r) => r.type === TicketType.EXPERIENCE && r.quantity > 0
        );
        const hasCorrection = rewards.some(
            (r) => r.type === TicketType.PORTFOLIO_CORRECTION && r.quantity > 0
        );

        if (!hasExperience && hasCorrection) {
            return '첨삭 의뢰하기';
        }
        return '경험 정리하기';
    }

    private resolveCtaLink(rewards: RewardConfigItem[]): string {
        const hasExperience = rewards.some(
            (r) => r.type === TicketType.EXPERIENCE && r.quantity > 0
        );
        const hasCorrection = rewards.some(
            (r) => r.type === TicketType.PORTFOLIO_CORRECTION && r.quantity > 0
        );

        if (!hasExperience && hasCorrection) {
            return '/correction';
        }
        return '/experience';
    }
}
