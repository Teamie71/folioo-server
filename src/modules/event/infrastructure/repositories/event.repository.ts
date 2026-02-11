import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../../domain/entities/event.entity';

@Injectable()
export class EventRepository {
    constructor(
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>
    ) {}

    async save(entity: Event): Promise<Event> {
        return this.eventRepository.save(entity);
    }

    async findById(id: number): Promise<Event | null> {
        return this.eventRepository.findOne({ where: { id } });
    }

    async existsById(id: number): Promise<boolean> {
        return this.eventRepository.exists({ where: { id } });
    }
}
