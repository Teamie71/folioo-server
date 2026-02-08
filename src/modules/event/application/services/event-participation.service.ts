import { Injectable } from '@nestjs/common';
import { EventParticipationRepository } from '../../infrastructure/repositories/event-participation.repository';

@Injectable()
export class EventParticipationService {
    constructor(private readonly eventParticipationRepository: EventParticipationRepository) {}
}
