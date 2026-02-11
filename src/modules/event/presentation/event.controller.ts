import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventService } from '../application/services/event.service';
import { EventParticipationService } from '../application/services/event-participation.service';

@ApiTags('Event')
@Controller('events')
export class EventController {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService
    ) {}
}
