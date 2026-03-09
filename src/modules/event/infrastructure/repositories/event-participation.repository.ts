import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';

@Injectable()
export class EventParticipationRepository {
    constructor(
        @InjectRepository(EventParticipation)
        private readonly eventParticipationRepository: Repository<EventParticipation>
    ) {}

    async save(entity: EventParticipation): Promise<EventParticipation> {
        return this.eventParticipationRepository.save(entity);
    }

    async findById(id: number): Promise<EventParticipation | null> {
        return this.eventParticipationRepository.findOne({ where: { id } });
    }

    async findByUserIdAndEventId(
        userId: number,
        eventId: number
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository.findOne({ where: { userId, eventId } });
    }

    async findByUserIdAndEventIdForUpdate(
        userId: number,
        eventId: number
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository
            .createQueryBuilder('participation')
            .where('participation.userId = :userId', { userId })
            .andWhere('participation.eventId = :eventId', { eventId })
            .setLock('pessimistic_write')
            .getOne();
    }

    async findByUserIdAndEventCode(
        userId: number,
        eventCode: string
    ): Promise<EventParticipation | null> {
        return this.eventParticipationRepository
            .createQueryBuilder('participation')
            .innerJoin('participation.event', 'event')
            .where('participation.userId = :userId', { userId })
            .andWhere('event.code = :eventCode', { eventCode })
            .getOne();
    }

    async findGrantedEventIdsByUserId(userId: number, eventIds: number[]): Promise<Set<number>> {
        if (eventIds.length === 0) {
            return new Set();
        }

        const rows = await this.eventParticipationRepository.find({
            select: ['eventId'],
            where: {
                userId,
                eventId: In(eventIds),
                rewardStatus: EventRewardStatus.GRANTED,
            },
        });

        return new Set(rows.map((r) => r.eventId));
    }

    async existsById(id: number): Promise<boolean> {
        return this.eventParticipationRepository.exists({ where: { id } });
    }
}
