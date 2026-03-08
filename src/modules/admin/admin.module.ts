import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { EventModule } from '../event/event.module';
import { TicketModule } from '../ticket/ticket.module';
import { AdminEventRewardController } from './presentation/admin-event-reward.controller';
import { AdminEventRewardFacade } from './application/facades/admin-event-reward.facade';
import { EventFeedbackSubmission } from './domain/entities/event-feedback-submission.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventFeedbackSubmissionRepository } from './infrastructure/event-feedback-submission.repository';
import { EventFeedbackSubmissionService } from './application/services/event-feedback-submission.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([EventFeedbackSubmission]),
        UserModule,
        EventModule,
        TicketModule,
    ],
    controllers: [AdminEventRewardController],
    providers: [
        AdminEventRewardFacade,
        EventFeedbackSubmissionRepository,
        EventFeedbackSubmissionService,
    ],
})
export class AdminModule {}
