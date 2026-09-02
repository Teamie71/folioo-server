import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminManualRewardEventItemResDTO,
    AdminManualRewardEventListResDTO,
    AdminUserItemResDTO,
    AdminUserSearchResDTO,
} from '../dtos/admin-event-reward.dto';
import type { GrantRewardByUserIdParams } from '../dtos/admin-event-reward.dto';
import { Transactional } from 'typeorm-transactional';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { EventService } from 'src/modules/event/application/services/event.service';
import { EventParticipationService } from 'src/modules/event/application/services/event-participation.service';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';

@Injectable()
export class AdminEventRewardFacade {
    constructor(
        private readonly userService: UserService,
        private readonly eventService: EventService,
        private readonly eventParticipationService: EventParticipationService,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade
    ) {}

    async searchUsers(keyword?: string): Promise<AdminUserSearchResDTO> {
        const projections = await this.userService.searchUsers(keyword);

        const users: AdminUserItemResDTO[] = projections.map((p) => {
            const item = new AdminUserItemResDTO();
            item.userId = p.userId;
            item.name = p.name;
            item.phoneNum = p.phoneNum;
            item.isActive = p.isActive;
            item.email = p.email;
            item.loginType = p.loginType;
            return item;
        });

        return AdminUserSearchResDTO.from(users, users.length);
    }

    async getManualRewardEvents(userId?: number): Promise<AdminManualRewardEventListResDTO> {
        const events = await this.eventService.findAllManualRewardEvents();

        let grantedEventIds = new Set<number>();
        if (userId) {
            const eventIds = events.map((e) => e.id);
            grantedEventIds = await this.eventParticipationService.findGrantedEventIdsByUserId(
                userId,
                eventIds
            );
        }

        const items = events.map((event) => {
            const item = new AdminManualRewardEventItemResDTO();
            item.code = event.code;
            item.title = event.title;
            item.rewardConfig = event.rewardConfig;
            item.allowMultipleRewards = event.opsConfig?.allowMultipleRewards === true;
            item.isGranted = grantedEventIds.has(event.id);
            return item;
        });

        return AdminManualRewardEventListResDTO.from(items);
    }

    async grantReward(
        eventCode: string,
        body: AdminGrantRewardReqDTO
    ): Promise<AdminGrantRewardResDTO> {
        const result = await this.grantFeedbackRewardByUserId(eventCode, {
            userId: body.userId,
            reviewedBy: body.reviewedBy,
            reviewNote: body.reviewNote,
            customRewards: body.customRewards,
        });

        const dto = new AdminGrantRewardResDTO();
        dto.eventCode = eventCode;
        dto.userId = result.userId;
        dto.rewardStatus = result.rewardStatus;
        dto.rewardGrantedAt = result.rewardGrantedAt.toISOString();
        return dto;
    }

    @Transactional()
    private async grantFeedbackRewardByUserId(
        eventCode: string,
        params: GrantRewardByUserIdParams
    ): Promise<{ userId: number; rewardStatus: EventRewardStatus; rewardGrantedAt: Date }> {
        const event = await this.eventService.findByCodeOrThrow(eventCode);
        if (!event.isActive) {
            throw new BusinessException(ErrorCode.EVENT_NOT_ACTIVE);
        }
        if (event.opsConfig?.manualRewardOnly !== true) {
            throw new BusinessException(ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED);
        }

        const user = await this.userService.findByIdOrThrow(params.userId);
        const allowMultiple = event.opsConfig?.allowMultipleRewards === true;

        const participation =
            await this.eventRewardLifecycleFacade.getOrCreateParticipationForUpdate(
                user.id,
                event.id
            );

        if (!allowMultiple) {
            if (
                participation.rewardStatus === EventRewardStatus.GRANTED ||
                participation.rewardGrantedAt
            ) {
                throw new BusinessException(ErrorCode.EVENT_REWARD_ALREADY_GRANTED);
            }
        }

        const now = new Date();

        participation.rewardStatus = EventRewardStatus.GRANTED;
        participation.rewardGrantedAt = now;
        const savedParticipation = await this.eventParticipationService.save(participation);

        return {
            userId: user.id,
            rewardStatus: savedParticipation.rewardStatus,
            rewardGrantedAt: now,
        };
    }
}
