import { Injectable } from '@nestjs/common';
import { SocialUser } from 'src/modules/user/domain/social-user.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { SocialUserRepository } from 'src/modules/user/infrastructure/repositories/social-user.repository';
import { UserRepository } from 'src/modules/user/infrastructure/repositories/user.repository';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthTokenStoreService } from '../../infrastructure/services/auth-token-store.service';
import { Transactional } from 'typeorm-transactional';
import type { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';

@Injectable()
export class LoginUsecase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly socialUserRepository: SocialUserRepository,
        private readonly tokenService: TokenService,
        private readonly authTokenStoreService: AuthTokenStoreService
    ) {}

    @Transactional()
    async execute(command: SocialUserAfterOAuth): Promise<string> {
        const existingSocialUser = await this.socialUserRepository.findByLoginTypeAndLoginId(
            command.socialType,
            command.id
        );

        let user: User;
        if (existingSocialUser) {
            user = existingSocialUser.user;

            if (existingSocialUser.email !== command.email) {
                existingSocialUser.email = command.email;
                await this.socialUserRepository.save(existingSocialUser);
            }
        } else {
            const newUser = User.createPendingUser(command.nickname);
            user = await this.userRepository.save(newUser);

            const socialUser = SocialUser.create(
                user.id,
                command.socialType,
                command.id,
                command.email
            );
            await this.socialUserRepository.save(socialUser);
        }

        const refreshToken = await this.tokenService.generateRefreshToken(user);
        await this.authTokenStoreService.whitelistRefreshToken(refreshToken, user.id);
        return refreshToken;
    }
}
