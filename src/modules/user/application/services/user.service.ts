import { Injectable } from '@nestjs/common';
import { UserProfileResDTO, UserSocialAccountResDTO } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from '../../domain/user.entity';
import { UserAgreementRepository } from '../../infrastructure/repositories/user-agreement.repository';
import { SocialUserRepository } from '../../infrastructure/repositories/social-user.repository';
import { TermType } from '../../domain/enums/term-type.enum';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { AgreeMarketingResDTO } from '../dtos/marketing-agree.dto';
import { SocialAccountUnlinkClient } from '../../infrastructure/clients/social-account-unlink.client';
import { Transactional } from 'typeorm-transactional';

const DEFAULT_TERMS_VERSION = 'v1.0';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userAgreementRepository: UserAgreementRepository,
        private readonly socialUserRepository: SocialUserRepository,
        private readonly socialAccountUnlinkClient: SocialAccountUnlinkClient
    ) {}

    async getProfile(userId: number): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        const socialAccounts = await this.getUserSocialAccounts(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, socialAccounts, isMarketingAgreed);
    }

    async updateProfile(userId: number, name: string): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        user.name = name;
        await this.userRepository.save(user);
        const socialAccounts = await this.getUserSocialAccounts(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, socialAccounts, isMarketingAgreed);
    }

    async updateMarketingConsent(
        userId: number,
        isMarketingAgreed: boolean
    ): Promise<AgreeMarketingResDTO> {
        await this.findByIdOrThrow(userId);

        const now = new Date();
        let agreement = await this.userAgreementRepository.findLatestByUserIdAndTermType(
            userId,
            TermType.MARKETING
        );
        const agreeAt = isMarketingAgreed ? now : null;

        if (!agreement) {
            const latestAgreement = await this.userAgreementRepository.findLatestByUserId(userId);
            agreement = UserAgreement.createMarketingAgreement(
                userId,
                latestAgreement?.version ?? DEFAULT_TERMS_VERSION,
                isMarketingAgreed,
                agreeAt
            );
        } else {
            agreement.isAgree = isMarketingAgreed;
            agreement.agreeAt = agreeAt;
        }

        const savedAgreement = await this.userAgreementRepository.save(agreement);

        return AgreeMarketingResDTO.from(savedAgreement.isAgree, savedAgreement.agreeAt);
    }

    async withdraw(userId: number): Promise<void> {
        const user = await this.findByIdOrThrow(userId);
        if (user.isDeactivated()) {
            throw new BusinessException(ErrorCode.DEACTIVATED_USER);
        }

        const socialUsers = await this.socialUserRepository.findByUserId(userId);
        for (const socialUser of socialUsers) {
            await this.socialAccountUnlinkClient.unlinkSocialAccount(socialUser);
        }

        await this.finalizeWithdrawal(user);
    }

    @Transactional()
    private async finalizeWithdrawal(user: User): Promise<void> {
        const now = new Date();
        const isDeactivated = await this.userRepository.deactivateById(user.id, now);
        if (!isDeactivated) {
            const latestUser = await this.userRepository.findById(user.id);
            if (!latestUser) {
                throw new BusinessException(ErrorCode.USER_NOT_FOUND);
            }

            if (latestUser.isDeactivated()) {
                throw new BusinessException(ErrorCode.DEACTIVATED_USER);
            }

            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        await this.socialUserRepository.deleteByUserId(user.id);
    }

    async findByPhoneNumOrThrow(phoneNum: string): Promise<User> {
        const user = await this.userRepository.findByPhoneNum(phoneNum);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }

    async checkUserActive(userId: number): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        if (user.isDeactivated()) {
            throw new BusinessException(ErrorCode.DEACTIVATED_USER);
        }
    }

    private async findByIdOrThrow(userId: number): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    private async getMarketingConsent(userId: number): Promise<boolean> {
        const marketingAgreement = await this.userAgreementRepository.findLatestByUserIdAndTermType(
            userId,
            TermType.MARKETING
        );

        return marketingAgreement?.isAgree ?? false;
    }

    private async getUserSocialAccounts(userId: number): Promise<UserSocialAccountResDTO[]> {
        const socialAccounts =
            await this.socialUserRepository.findProfileSocialAccountsByUserId(userId);

        return socialAccounts.map((socialAccount) =>
            UserSocialAccountResDTO.from(socialAccount.loginType, socialAccount.email)
        );
    }
}
