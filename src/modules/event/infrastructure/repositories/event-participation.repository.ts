import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventParticipation } from '../../domain/entities/event-participation.entity';

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

    async existsById(id: number): Promise<boolean> {
        return this.eventParticipationRepository.exists({ where: { id } });
    }
}
