import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './domain/entities/event.entity';
import { EventParticipation } from './domain/entities/event-participation.entity';
import { EventRepository } from './infrastructure/repositories/event.repository';
import { EventParticipationRepository } from './infrastructure/repositories/event-participation.repository';
import { EventService } from './application/services/event.service';
import { EventParticipationService } from './application/services/event-participation.service';
import { EventController } from './presentation/event.controller';
import { EventRewardFacade } from './application/facades/event-reward.facade';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { TicketModule } from '../ticket/ticket.module';

@Module({
    imports: [TypeOrmModule.forFeature([Event, EventParticipation]), TicketModule],
    controllers: [EventController],
    providers: [
        EventRepository,
        EventParticipationRepository,
        EventService,
        EventParticipationService,
        EventRewardFacade,
        InternalApiKeyGuard,
    ],
    exports: [EventService, EventParticipationService, EventRewardFacade],
})
export class EventModule {}
