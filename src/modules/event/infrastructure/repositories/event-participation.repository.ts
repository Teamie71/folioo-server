import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventParticipation } from '../../domain/entities/event-participation.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

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

    async findByIdOrThrow(id: number): Promise<EventParticipation> {
        const entity = await this.findById(id);
        if (!entity) {
            throw new BusinessException(ErrorCode.EVENT_PARTICIPATION_NOT_FOUND);
        }
        return entity;
    }

    async existsById(id: number): Promise<boolean> {
        return this.eventParticipationRepository.exists({ where: { id } });
    }
}
