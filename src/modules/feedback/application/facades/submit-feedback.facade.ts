import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';
import { EventParticipationService } from 'src/modules/event/application/services/event-participation.service';
import { EventService } from 'src/modules/event/application/services/event.service';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { FeedbackResponse } from '../../domain/entities/feedback-response.entity';
import { SubmitFeedbackResponseReqDTO } from '../dtos/submit-feedback-response.req.dto';
import { SubmitFeedbackResponseResDTO } from '../dtos/submit-feedback-response.res.dto';
import { FeedbackSubmissionService } from '../services/feedback-submission.service';
import { FeedbackFormRepository } from '../../infrastructure/repositories/feedback-form.repository';
import { FeedbackResponseRepository } from '../../infrastructure/repositories/feedback-response.repository';

@Injectable()
export class SubmitFeedbackFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade,
        private readonly eventParticipationService: EventParticipationService,
        private readonly feedbackSubmissionService: FeedbackSubmissionService,
        private readonly feedbackFormRepository: FeedbackFormRepository,
        private readonly feedbackResponseRepository: FeedbackResponseRepository
    ) {}

    @Transactional()
    async submit(
        userId: number,
        dto: SubmitFeedbackResponseReqDTO
    ): Promise<SubmitFeedbackResponseResDTO> {
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
            return SubmitFeedbackResponseResDTO.of(false);
        }

        const cooldownElapsed = this.feedbackSubmissionService.isRewardCooldownElapsed(
            participation.rewardGrantedAt,
            new Date()
        );

        await this.feedbackResponseRepository.save(response);

        if (
            !cooldownElapsed ||
            this.feedbackSubmissionService.shouldSuppressRepeatReward(event, participation)
        ) {
            return SubmitFeedbackResponseResDTO.of(false);
        }

        const now = new Date();
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        await this.eventParticipationService.save(participation);
        return SubmitFeedbackResponseResDTO.of(true);
    }
}
