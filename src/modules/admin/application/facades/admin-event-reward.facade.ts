import { Injectable, Logger } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminGrantTicketsReqDTO,
    AdminGrantTicketsResDTO,
    AdminTicketHistoryItemResDTO,
    AdminTicketHistoryResDTO,
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
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { EventFeedbackSubmission } from '../../domain/entities/event-feedback-submission.entity';
import { EventFeedbackSource } from '../../domain/enums/event-feedback-source.enum';

@Injectable()
export class AdminEventRewardFacade {
    private readonly logger = new Logger(AdminEventRewardFacade.name);

    constructor(
        private readonly userService: UserService,
        private readonly eventFeedbackSubmissionService: EventFeedbackSubmissionService,
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly eventRewardFacade: EventRewardFacade,
        private readonly ticketService: TicketService
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

    async grantReward(
        eventCode: string,
        body: AdminGrantRewardReqDTO
    ): Promise<AdminGrantRewardResDTO> {
        const result = await this.grantFeedbackRewardByUserId(eventCode, {
            userId: body.userId,
            externalSubmissionId: body.externalSubmissionId,
            reviewedBy: body.reviewedBy,
            reviewNote: body.reviewNote,
        });

        const dto = new AdminGrantRewardResDTO();
        dto.eventCode = eventCode;
        dto.userId = result.userId;
        dto.rewardStatus = result.rewardStatus;
        dto.rewardGrantedAt = result.rewardGrantedAt.toISOString();
        return dto;
    }

    async grantTickets(body: AdminGrantTicketsReqDTO): Promise<AdminGrantTicketsResDTO> {
        await this.userService.findByIdOrThrow(body.userId);
        await this.ticketService.issueAdminTickets(body.userId, body.type, body.quantity);

        this.logger.log(
            `Admin ticket grant: userId=${body.userId}, type=${body.type}, qty=${body.quantity}, reason="${body.reason}"`
        );

        const balance = await this.ticketService.getBalance(body.userId);
        const remainingBalance =
            body.type === TicketType.EXPERIENCE
                ? balance.experience.count
                : balance.portfolioCorrection.count;

        const dto = new AdminGrantTicketsResDTO();
        dto.userId = body.userId;
        dto.type = body.type;
        dto.quantity = body.quantity;
        dto.reason = body.reason;
        dto.remainingBalance = remainingBalance;
        return dto;
    }

    async getTicketHistory(): Promise<AdminTicketHistoryResDTO> {
        const rows = await this.ticketService.getTicketHistory();

        const history: AdminTicketHistoryItemResDTO[] = rows.map((r) => {
            const item = new AdminTicketHistoryItemResDTO();
            item.ticketId = r.ticketId;
            item.userId = r.userId;
            item.userName = r.userName;
            item.userEmail = r.userEmail;
            item.type = r.type;
            item.status = r.status;
            item.source = r.source;
            item.createdAt = r.createdAt.toISOString();
            item.usedAt = r.usedAt ? r.usedAt.toISOString() : null;
            item.expiredAt = r.expiredAt ? r.expiredAt.toISOString() : null;
            return item;
        });

        const dto = new AdminTicketHistoryResDTO();
        dto.history = history;
        dto.total = history.length;
        return dto;
    }

    @Transactional()
    async grantFeedbackRewardByUserId(
        eventCode: string,
        params: GrantRewardByUserIdParams
    ): Promise<{ userId: number; rewardStatus: EventRewardStatus; rewardGrantedAt: Date }> {
        const event = await this.eventService.findActiveByCodeOrThrow(eventCode);
        if (event.opsConfig?.manualRewardOnly === false) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const user = await this.userService.findByIdOrThrow(params.userId);

        if (params.externalSubmissionId) {
            const existingSubmission =
                await this.eventFeedbackSubmissionService.findByEventIdAndExternalSubmissionId(
                    event.id,
                    params.externalSubmissionId
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

        const participation = await this.eventRewardFacade.getOrCreateParticipationForUpdate(
            user.id,
            event.id
        );

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
        participation.grantedBy = params.reviewedBy ?? 'admin-ui';
        participation.grantReason = params.reviewNote ?? null;
        const savedParticipation = await this.eventParticipationService.save(participation);

        await this.ticketService.issueTickets(
            user.id,
            {
                source: TicketSource.EVENT,
                eventParticipationId: savedParticipation.id,
            },
            event.rewardConfig
        );

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
}
