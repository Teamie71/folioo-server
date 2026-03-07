import { Injectable } from '@nestjs/common';
import { TicketBalanceResDTO } from 'src/modules/ticket/application/dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from 'src/modules/ticket/application/dtos/ticket-expiring.dto';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { UserService } from '../services/user.service';
import { AgreeTermsResDTO } from '../dtos/agree-terms.dto';
import { EventRewardFacade } from 'src/modules/event/application/facades/event-reward.facade';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserTicketFacade {
    constructor(
        private readonly userService: UserService,
        private readonly ticketService: TicketService,
        private readonly eventRewardFacade: EventRewardFacade
    ) {}

    getBalance(userId: number): Promise<TicketBalanceResDTO> {
        return this.ticketService.getBalance(userId);
    }

    getExpiring(userId: number, days: number): Promise<TicketExpiringResDTO> {
        return this.ticketService.getExpiring(userId, days);
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
            await this.eventRewardFacade.grantSignUpReward(userId);
        }

        return agreed;
    }
}
