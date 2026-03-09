import { Injectable } from '@nestjs/common';
import { EventParticipationRepository } from '../../infrastructure/repositories/event-participation.repository';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class EventParticipationService {
    constructor(private readonly eventParticipationRepository: EventParticipationRepository) {}

    async findByIdOrThrow(id: number): Promise<EventParticipation> {
        const participation = await this.eventParticipationRepository.findById(id);
        if (!participation) {
            throw new BusinessException(ErrorCode.EVENT_PARTICIPATION_NOT_FOUND);
        }
        return participation;
    }

    async findByUserIdAndEventId(
        userId: number,
        eventId: number
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository.findByUserIdAndEventId(userId, eventId);
    }

    async findByUserIdAndEventIdForUpdate(
        userId: number,
        eventId: number
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository.findByUserIdAndEventIdForUpdate(userId, eventId);
    }

    async findByUserIdAndEventCode(
        userId: number,
        eventCode: string
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository.findByUserIdAndEventCode(userId, eventCode);
    }

    async save(participation: EventParticipation): Promise<EventParticipation> {
        return this.eventParticipationRepository.save(participation);
    }

    async findGrantedEventIdsByUserId(userId: number, eventIds: number[]): Promise<Set<number>> {
        return this.eventParticipationRepository.findGrantedEventIdsByUserId(userId, eventIds);
    }

    async create(userId: number, eventId: number): Promise<EventParticipation> {
        const participation = new EventParticipation();
        participation.userId = userId;
        participation.eventId = eventId;
        participation.progress = 0;
        participation.isCompleted = false;
        participation.lastProgressedAt = null;
        return this.eventParticipationRepository.save(participation);
    }
}
