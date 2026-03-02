import { Injectable } from '@nestjs/common';
import { EventFeedbackSubmission } from '../../domain/entities/event-feedback-submission.entity';
import { EventFeedbackSubmissionRepository } from '../../infrastructure/repositories/event-feedback-submission.repository';

@Injectable()
export class EventFeedbackSubmissionService {
    constructor(private readonly feedbackSubmissionRepository: EventFeedbackSubmissionRepository) {}

    async save(submission: EventFeedbackSubmission): Promise<EventFeedbackSubmission> {
        return this.feedbackSubmissionRepository.save(submission);
    }

    async findByEventIdAndExternalSubmissionId(
        eventId: number,
        externalSubmissionId: string
    ): Promise<EventFeedbackSubmission | null> {
        return this.feedbackSubmissionRepository.findByEventIdAndExternalSubmissionId(
            eventId,
            externalSubmissionId
        );
    }

    async findLatestByUserIdAndEventId(
        userId: number,
        eventId: number
    ): Promise<EventFeedbackSubmission | null> {
        return this.feedbackSubmissionRepository.findLatestByUserIdAndEventId(userId, eventId);
    }
}
