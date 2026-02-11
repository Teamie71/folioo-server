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
}
