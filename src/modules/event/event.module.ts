import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './domain/entities/event.entity';
import { EventParticipation } from './domain/entities/event-participation.entity';
import { EventFeedbackSubmission } from './domain/entities/event-feedback-submission.entity';
import { EventRepository } from './infrastructure/repositories/event.repository';
import { EventParticipationRepository } from './infrastructure/repositories/event-participation.repository';
import { EventFeedbackSubmissionRepository } from './infrastructure/repositories/event-feedback-submission.repository';
import { EventService } from './application/services/event.service';
import { EventParticipationService } from './application/services/event-participation.service';
import { EventFeedbackSubmissionService } from './application/services/event-feedback-submission.service';
import { EventController } from './presentation/event.controller';
import { EventRewardFacade } from './application/facades/event-reward.facade';
import { UserModule } from '../user/user.module';
import { TicketModule } from '../ticket/ticket.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Event, EventParticipation, EventFeedbackSubmission]),
        UserModule,
        TicketModule,
    ],
    controllers: [EventController],
    providers: [
        EventRepository,
        EventParticipationRepository,
        EventFeedbackSubmissionRepository,
        EventService,
        EventParticipationService,
        EventFeedbackSubmissionService,
        EventRewardFacade,
    ],
    exports: [
        EventService,
        EventParticipationService,
        EventFeedbackSubmissionService,
        EventRewardFacade,
    ],
})
export class EventModule {}
