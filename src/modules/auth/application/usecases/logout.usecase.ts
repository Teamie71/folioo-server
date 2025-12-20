import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_STORE_PORT } from '../ports/refresh-token-store.port';
import type { RefreshTokenStorePort } from '../ports/refresh-token-store.port';
@Injectable()
export class LogoutUseCase {
    constructor(
        @Inject(REFRESH_TOKEN_STORE_PORT) private readonly refreshStore: RefreshTokenStorePort
    ) {}

    async execute(input: { userId: string }) {
        await this.refreshStore.deleteByUserId(input.userId);
        return { message: 'Logged out' };
    }
}
