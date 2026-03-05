import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminUserItemResDTO,
    AdminUserSearchResDTO,
} from '../dtos/admin-event-reward.dto';

@Injectable()
export class AdminEventRewardFacade {
    constructor(
        private readonly userService: UserService,
        private readonly eventRewardFacade: EventRewardFacade
    ) {}

    async searchUsers(name: string): Promise<AdminUserSearchResDTO> {
        const projections = await this.userService.searchByName(name);

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

    async grantReward(
        eventCode: string,
        body: AdminGrantRewardReqDTO
    ): Promise<AdminGrantRewardResDTO> {
        const result = await this.eventRewardFacade.grantFeedbackRewardByUserId(eventCode, {
            userId: body.userId,
            externalSubmissionId: body.externalSubmissionId,
            reviewedBy: body.reviewedBy,
            reviewNote: body.reviewNote,
        });

        const dto = new AdminGrantRewardResDTO();
        dto.eventCode = eventCode;
        dto.userId = result.userId;
        dto.rewardStatus = result.rewardStatus;
        dto.rewardGrantedAt = result.rewardGrantedAt.toISOString();
        return dto;
    }
}
