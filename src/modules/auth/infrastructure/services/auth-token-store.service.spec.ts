import { AuthToken, AuthTokenType } from '../../domain/entities/auth-token.entity';
import { AuthTokenStoreService } from './auth-token-store.service';

describe('AuthTokenStoreService', () => {
    const authTokenRepository = {
        save: jest.fn<Promise<AuthToken>, [AuthToken]>(),
        existsValid: jest.fn(),
        deleteByToken: jest.fn(),
    };

    function buildService(
        configValues: Record<string, string> = {},
        decodedExp: number | null = null
    ): AuthTokenStoreService {
        const configService = { get: (key: string) => configValues[key] } as never;
        const jwtService = {
            decode: () => (decodedExp === null ? null : { exp: decodedExp }),
        } as never;
        return new AuthTokenStoreService(authTokenRepository as never, configService, jwtService);
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('whitelists a refresh token with an expiry derived from JWT_REFRESH_EXPIRES_IN', async () => {
        const service = buildService({ JWT_REFRESH_EXPIRES_IN: '1d' });

        await service.whitelistRefreshToken('refresh-token', 42);

        expect(authTokenRepository.save).toHaveBeenCalledTimes(1);
        const saved = authTokenRepository.save.mock.calls[0][0];
        expect(saved.type).toBe(AuthTokenType.REFRESH);
        expect(saved.token).toBe('refresh-token');
        expect(saved.userId).toBe(42);
        expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('skips storing an access-token blacklist entry when the token is already expired', async () => {
        const service = buildService({}, Math.floor(Date.now() / 1000) - 10);

        await service.blacklistAccessToken('expired-access-token');

        expect(authTokenRepository.save).not.toHaveBeenCalled();
    });

    it('stores an access-token blacklist entry with an expiry from the token exp claim', async () => {
        const expSeconds = Math.floor(Date.now() / 1000) + 3600;
        const service = buildService({}, expSeconds);

        await service.blacklistAccessToken('access-token');

        expect(authTokenRepository.save).toHaveBeenCalledTimes(1);
        const saved = authTokenRepository.save.mock.calls[0][0];
        expect(saved.type).toBe(AuthTokenType.ACCESS_BLACKLIST);
        expect(saved.token).toBe('access-token');
        expect(Math.abs(saved.expiresAt.getTime() - expSeconds * 1000)).toBeLessThan(2000);
    });
});
