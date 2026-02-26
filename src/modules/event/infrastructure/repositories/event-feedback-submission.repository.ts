import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventFeedbackSubmission } from '../../domain/entities/event-feedback-submission.entity';

@Injectable()
export class EventFeedbackSubmissionRepository {
    constructor(
        @InjectRepository(EventFeedbackSubmission)
        private readonly feedbackSubmissionRepository: Repository<EventFeedbackSubmission>
    ) {}

    async save(entity: EventFeedbackSubmission): Promise<EventFeedbackSubmission> {
        return this.feedbackSubmissionRepository.save(entity);
    }

    async findByEventIdAndExternalSubmissionId(
        eventId: number,
        externalSubmissionId: string
    ): Promise<EventFeedbackSubmission | null> {
        return this.feedbackSubmissionRepository.findOne({
            where: {
                eventId,
                externalSubmissionId,
            },
        });
    }

    async findLatestByUserIdAndEventId(
        userId: number,
        eventId: number
    ): Promise<EventFeedbackSubmission | null> {
        return this.feedbackSubmissionRepository.findOne({
            where: {
                userId,
                eventId,
            },
            order: {
                createdAt: 'DESC',
            },
        });
    }
}
