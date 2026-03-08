import { Injectable } from '@nestjs/common';
import { TicketBalanceResDTO } from 'src/modules/ticket/application/dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from 'src/modules/ticket/application/dtos/ticket-expiring.dto';
import { TicketHistoryResDTO } from 'src/modules/ticket/application/dtos/ticket-history.dto';
import { TicketGrantNoticeResDTO } from 'src/modules/ticket/application/dtos/ticket-grant-notice.dto';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { UserService } from '../services/user.service';
import { AgreeTermsResDTO } from '../dtos/agree-terms.dto';
import { EventRewardLifecycleService } from 'src/modules/event/application/services/event-reward-lifecycle.service';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserTicketFacade {
    constructor(
        private readonly userService: UserService,
        private readonly ticketService: TicketService,
        private readonly eventRewardLifecycleService: EventRewardLifecycleService,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

    getBalance(userId: number): Promise<TicketBalanceResDTO> {
        return this.ticketService.getBalance(userId);
    }

    getExpiring(userId: number, days: number): Promise<TicketExpiringResDTO> {
        return this.ticketService.getExpiring(userId, days);
    }

    getHistory(userId: number): Promise<TicketHistoryResDTO> {
        return this.ticketService.getUserTicketHistory(userId);
    }

    getNextGrantNotice(userId: number): Promise<TicketGrantNoticeResDTO | null> {
        return this.ticketGrantFacade.getNextNotice(userId);
    }

    markGrantNoticeShown(userId: number, noticeId: number): Promise<TicketGrantNoticeResDTO> {
        return this.ticketGrantFacade.markNoticeShown(userId, noticeId);
    }

    markGrantNoticeDismissed(userId: number, noticeId: number): Promise<TicketGrantNoticeResDTO> {
        return this.ticketGrantFacade.markNoticeDismissed(userId, noticeId);
    }

    @Transactional()
    async onBoarding(
        userId: number,
        isServiceAgreed: boolean,
        isPrivacyAgreed: boolean,
        isMarketingAgreed: boolean
    ): Promise<AgreeTermsResDTO> {
        const agreed = await this.userService.agreeTerms(
            userId,
            isServiceAgreed,
            isPrivacyAgreed,
            isMarketingAgreed
        );

        const isRejoined = await this.userService.checkIfWithdrawn(userId);
        if (!isRejoined) {
            await this.eventRewardLifecycleService.grantSignUpReward(userId);
        }

        return agreed;
    }
}
