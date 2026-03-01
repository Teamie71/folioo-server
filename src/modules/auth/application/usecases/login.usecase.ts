import { Injectable } from '@nestjs/common';
import { User } from 'src/modules/user/domain/user.entity';
import { UserRepository } from 'src/modules/user/infrastructure/repositories/user.repository';
import { TokenService } from '../../infrastructure/services/token.service';
import { AuthTokenStoreService } from '../../infrastructure/services/auth-token-store.service';
import { Transactional } from 'typeorm-transactional';
import type { SocialUserAfterOAuth } from '../../domain/types/jwt-payload.type';

@Injectable()
export class LoginUsecase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly tokenService: TokenService,
        private readonly authTokenStoreService: AuthTokenStoreService
    ) {}

    @Transactional()
    async execute(command: SocialUserAfterOAuth): Promise<string> {
        // 1. DB에 사용자가 있는지 확인
        let existingUser = await this.userRepository.findBySocialIdAndSocialType(
            command.id,
            command.socialType
        );
        // 2. 해당하는 사용자가 없다면 유저 등록
        if (!existingUser) {
            const newUser = User.createSocialUser(
                command.nickname,
                command.email,
                command.id,
                command.socialType
            );
            existingUser = await this.userRepository.save(newUser);
        }
        // 3. JWT 토큰 발급
        const refreshToken = await this.tokenService.generateRefreshToken(existingUser);
        await this.authTokenStoreService.whitelistRefreshToken(refreshToken, existingUser.id);
        return refreshToken;
    }
}
