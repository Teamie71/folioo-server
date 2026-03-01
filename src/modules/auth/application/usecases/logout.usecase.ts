import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AuthTokenStoreService } from '../../infrastructure/services/auth-token-store.service';

interface LogoutCommand {
    accessToken: string | null;
    refreshToken: string | null;
}

@Injectable()
export class LogoutUsecase {
    constructor(private readonly authTokenStoreService: AuthTokenStoreService) {}

    async execute(command: LogoutCommand): Promise<void> {
        if (!command.accessToken) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        await this.authTokenStoreService.blacklistAccessToken(command.accessToken);

        if (command.refreshToken) {
            await this.authTokenStoreService.removeRefreshToken(command.refreshToken);
        }
    }
}
