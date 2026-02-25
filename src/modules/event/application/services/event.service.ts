import { Injectable } from '@nestjs/common';
import { EventRepository } from '../../infrastructure/repositories/event.repository';
import { Event } from '../../domain/entities/event.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class EventService {
    constructor(private readonly eventRepository: EventRepository) {}

    async findByIdOrThrow(id: number): Promise<Event> {
        const event = await this.eventRepository.findById(id);
        if (!event) {
            throw new BusinessException(ErrorCode.EVENT_NOT_FOUND);
        }
        return event;
    }

    async findByCodeOrThrow(code: string): Promise<Event> {
        const event = await this.eventRepository.findByCode(code);
        if (!event) {
            throw new BusinessException(ErrorCode.EVENT_NOT_FOUND);
        }
        return event;
    }

    async findActiveByCodeOrThrow(code: string): Promise<Event> {
        const today = new Date().toISOString().slice(0, 10);
        const event = await this.eventRepository.findActiveByCode(code, today);
        if (!event) {
            throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        }
        return event;
    }
}
