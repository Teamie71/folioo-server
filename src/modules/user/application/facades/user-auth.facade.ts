import { Injectable } from '@nestjs/common';
import { LogoutUsecase } from 'src/modules/auth/application/usecases/logout.usecase';
import { UserService } from '../services/user.service';

@Injectable()
export class UserAuthFacade {
    constructor(
        private readonly userService: UserService,
        private readonly logoutUsecase: LogoutUsecase
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
}
