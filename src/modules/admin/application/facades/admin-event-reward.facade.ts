import { Injectable, Logger } from '@nestjs/common';
import { UserService } from 'src/modules/user/application/services/user.service';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminGrantTicketsReqDTO,
    AdminGrantTicketsResDTO,
    AdminTicketHistoryItemResDTO,
    AdminTicketHistoryResDTO,
    AdminUserItemResDTO,
    AdminUserSearchResDTO,
} from '../dtos/admin-event-reward.dto';

@Injectable()
export class AdminEventRewardFacade {
    private readonly logger = new Logger(AdminEventRewardFacade.name);

    constructor(
        private readonly userService: UserService,
        private readonly eventRewardFacade: EventRewardFacade,
        private readonly ticketService: TicketService
    ) {}

    async searchUsers(keyword?: string): Promise<AdminUserSearchResDTO> {
        const projections = await this.userService.searchUsers(keyword);
        const balanceMap = await this.ticketService.getBalanceBatch();

        const users: AdminUserItemResDTO[] = projections.map((p) => {
            const balance = balanceMap.get(p.userId) ?? { experience: 0, correction: 0 };
            const item = new AdminUserItemResDTO();
            item.userId = p.userId;
            item.name = p.name;
            item.phoneNum = p.phoneNum;
            item.isActive = p.isActive;
            item.email = p.email;
            item.loginType = p.loginType;
            item.experienceTickets = balance.experience;
            item.correctionTickets = balance.correction;
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

    async grantTickets(body: AdminGrantTicketsReqDTO): Promise<AdminGrantTicketsResDTO> {
        await this.userService.findByIdOrThrow(body.userId);
        await this.ticketService.issueAdminTickets(body.userId, body.type, body.quantity);

        this.logger.log(
            `Admin ticket grant: userId=${body.userId}, type=${body.type}, qty=${body.quantity}, reason="${body.reason}"`
        );

        const balance = await this.ticketService.getBalance(body.userId);
        const remainingBalance =
            body.type === TicketType.EXPERIENCE
                ? balance.experience.count
                : balance.portfolioCorrection.count;

        const dto = new AdminGrantTicketsResDTO();
        dto.userId = body.userId;
        dto.type = body.type;
        dto.quantity = body.quantity;
        dto.reason = body.reason;
        dto.remainingBalance = remainingBalance;
        return dto;
    }

    async getTicketHistory(): Promise<AdminTicketHistoryResDTO> {
        const rows = await this.ticketService.getTicketHistory();

        const history: AdminTicketHistoryItemResDTO[] = rows.map((r) => {
            const item = new AdminTicketHistoryItemResDTO();
            item.ticketId = r.ticketId;
            item.userId = r.userId;
            item.userName = r.userName;
            item.userEmail = r.userEmail;
            item.type = r.type;
            item.status = r.status;
            item.source = r.source;
            item.createdAt =
                r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt);
            item.usedAt =
                r.usedAt instanceof Date
                    ? r.usedAt.toISOString()
                    : r.usedAt
                      ? String(r.usedAt)
                      : null;
            item.expiredAt =
                r.expiredAt instanceof Date
                    ? r.expiredAt.toISOString()
                    : r.expiredAt
                      ? String(r.expiredAt)
                      : null;
            return item;
        });

        const dto = new AdminTicketHistoryResDTO();
        dto.history = history;
        dto.total = history.length;
        return dto;
    }
}
