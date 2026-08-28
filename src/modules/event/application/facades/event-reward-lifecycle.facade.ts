import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ClaimEventRewardResDTO } from '../dtos/event.dto';
import { EventService } from '../services/event.service';
import { EventParticipationService } from '../services/event-participation.service';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventParticipation } from '../../domain/entities/event-participation.entity';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class EventRewardLifecycleFacade {
    constructor(
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService
    ) {}

    @Transactional()
    async claimEventReward(userId: number, eventCode: string): Promise<ClaimEventRewardResDTO> {
        const event = await this.eventService.findActiveByCodeOrThrow(eventCode);
        if (event.opsConfig?.manualRewardOnly === true) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const participation = await this.getOrCreateParticipationForUpdate(userId, event.id);

        if (
            participation.rewardStatus === EventRewardStatus.GRANTED ||
            participation.rewardGrantedAt
        ) {
            throw new BusinessException(ErrorCode.EVENT_REWARD_ALREADY_GRANTED);
        }

        const now = new Date();
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;

        const savedParticipation = await this.eventParticipationService.save(participation);

        const dto = new ClaimEventRewardResDTO();
        dto.eventCode = event.code;
        dto.rewardStatus = savedParticipation.rewardStatus;
        dto.rewardGrantedAt = now.toISOString();
        return dto;
    }

    @Transactional()
    async grantSignUpReward(userId: number): Promise<void> {
        const activeSignupEvent = await this.eventService.findSignUpEvent();
        if (!activeSignupEvent) {
            return;
        }
        const participation = await this.getOrCreateParticipationForUpdate(
            userId,
            activeSignupEvent.id
        );
        if (participation.rewardStatus === EventRewardStatus.GRANTED) {
            return;
        }
        const now = new Date();
        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        await this.eventParticipationService.save(participation);
    }

    @Transactional()
    async getOrCreateParticipationForUpdate(
        userId: number,
        eventId: number
    ): Promise<EventParticipation> {
        let participation = await this.eventParticipationService.findByUserIdAndEventIdForUpdate(
            userId,
            eventId
        );

        if (!participation) {
            try {
                participation = await this.eventParticipationService.create(userId, eventId);
            } catch (error) {
                if (!this.isUniqueViolation(error)) {
                    throw error;
                }

                participation =
                    await this.eventParticipationService.findByUserIdAndEventIdForUpdate(
                        userId,
                        eventId
                    );
            }
        }

        if (!participation) {
            throw new BusinessException(ErrorCode.EVENT_PARTICIPATION_NOT_FOUND);
        }

        return participation;
    }

    private isUniqueViolation(error: unknown): boolean {
        if (typeof error !== 'object' || error === null || !('driverError' in error)) {
            return false;
        }

        const driverError = (error as { driverError?: unknown }).driverError;
        if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
            return false;
        }

        return typeof driverError.code === 'string' && driverError.code === UNIQUE_VIOLATION_CODE;
    }
}
