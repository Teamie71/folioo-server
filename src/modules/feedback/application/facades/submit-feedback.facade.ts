import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';
import { EventParticipationService } from 'src/modules/event/application/services/event-participation.service';
import { EventService } from 'src/modules/event/application/services/event.service';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketGrantActorType } from 'src/modules/ticket/domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from 'src/modules/ticket/domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { FeedbackResponse } from '../../domain/entities/feedback-response.entity';
import { SubmitFeedbackResponseReqDTO } from '../dtos/submit-feedback-response.req.dto';
import { FeedbackFormRepository } from '../../infrastructure/repositories/feedback-form.repository';
import { FeedbackResponseRepository } from '../../infrastructure/repositories/feedback-response.repository';

@Injectable()
export class SubmitFeedbackFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade,
        private readonly eventParticipationService: EventParticipationService,
        private readonly feedbackFormRepository: FeedbackFormRepository,
        private readonly feedbackResponseRepository: FeedbackResponseRepository,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

    @Transactional()
    async submit(userId: number, dto: SubmitFeedbackResponseReqDTO): Promise<void> {
        const event = await this.eventService.findByIdAndAssertActiveForTodayOrThrow(dto.eventId);

        const participation =
            await this.eventRewardLifecycleFacade.getOrCreateParticipationForUpdate(
                userId,
                dto.eventId
            );

        const form = await this.feedbackFormRepository.findById(dto.formId);
        if (!form || form.eventId !== dto.eventId) {
            throw new BusinessException(ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH);
        }

        const response = FeedbackResponse.createForSubmit({
            participationId: participation.id,
            formId: form.id,
            answers: dto.answers,
        });

        const hasRewards = event.rewardConfig.some((item) => item.quantity > 0);
        if (!hasRewards) {
            await this.feedbackResponseRepository.save(response);
            return;
        }

        const lastSubmittedAt =
            await this.feedbackResponseRepository.findLatestSubmittedAtByParticipationId(
                participation.id
            );

        const now = new Date();
        const canGrantByCooldown =
            lastSubmittedAt == null ||
            DateTime.fromJSDate(lastSubmittedAt, { zone: 'utc' }).plus({
                days: FeedbackResponse.REWARD_COOLDOWN_DAYS,
            }) <= DateTime.fromJSDate(now, { zone: 'utc' });

        if (!canGrantByCooldown) {
            throw new BusinessException(ErrorCode.FEEDBACK_REWARD_COOLDOWN_ACTIVE);
        }

        await this.feedbackResponseRepository.save(response);

        await this.ticketGrantFacade.issueGrantAndTickets({
            userId,
            rewards: event.rewardConfig,
            grantSourceType: TicketGrantSourceType.EVENT,
            issueContext: {
                source: TicketSource.EVENT,
                eventParticipationId: participation.id,
            },
            actorType: TicketGrantActorType.SYSTEM,
            actorId: 'feedback-submit',
            sourceRefId: participation.id,
            reasonCode: 'event_feedback_submit',
            reasonText: '이벤트 피드백 제출 보상',
            grantedAt: now,
        });
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        await this.eventParticipationService.save(participation);
    }
}
