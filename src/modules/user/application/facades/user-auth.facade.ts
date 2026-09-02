import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { LogoutUsecase } from 'src/modules/auth/application/usecases/logout.usecase';
import { EventRewardLifecycleFacade } from 'src/modules/event/application/facades/event-reward-lifecycle.facade';
import { UserService } from '../services/user.service';
import { AgreeTermsResDTO } from '../dtos/agree-terms.dto';

@Injectable()
export class UserAuthFacade {
    constructor(
        private readonly userService: UserService,
        private readonly logoutUsecase: LogoutUsecase,
        private readonly eventRewardLifecycleFacade: EventRewardLifecycleFacade
    ) {}

    async withdraw(
        userId: number,
        accessToken: string,
        refreshToken: string | null
    ): Promise<void> {
        await this.userService.withdraw(userId);
        await this.logoutUsecase.execute({
            accessToken,
            refreshToken,
        });
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
            await this.eventRewardLifecycleFacade.grantSignUpReward(userId);
        }

        return agreed;
    }
}
