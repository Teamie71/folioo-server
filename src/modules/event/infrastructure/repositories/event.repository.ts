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

    async findByCode(code: string): Promise<Event | null> {
        return this.eventRepository.findOne({ where: { code } });
    }

    async findActiveByCode(code: string, today: string): Promise<Event | null> {
        return this.eventRepository
            .createQueryBuilder('event')
            .where('event.code = :code', { code })
            .andWhere('event.isActive = true')
            .andWhere('event.startDate <= :today', { today })
            .andWhere('(event.endDate IS NULL OR event.endDate >= :today)', { today })
            .getOne();
    }

    async existsById(id: number): Promise<boolean> {
        return this.eventRepository.exists({ where: { id } });
    }
}
