import { Injectable } from '@nestjs/common';
import { UserProfileResDTO, UserSocialAccountResDTO } from '../dtos/user-profile.dto';
import {
    UserRepository,
    UserWithSocialInfoProjection,
} from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from '../../domain/user.entity';
import { UserAgreementRepository } from '../../infrastructure/repositories/user-agreement.repository';
import { TermRepository } from '../../infrastructure/repositories/term.repository';
import { SocialUserRepository } from '../../infrastructure/repositories/social-user.repository';
import { TermType } from '../../domain/enums/term-type.enum';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { AgreeMarketingResDTO } from '../dtos/marketing-agree.dto';
import { SocialAccountUnlinkClient } from '../../infrastructure/clients/social-account-unlink.client';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userAgreementRepository: UserAgreementRepository,
        private readonly termRepository: TermRepository,
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

        const marketingTerm = await this.termRepository.findActiveByTermType(TermType.MARKETING);
        if (!marketingTerm) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const now = new Date();
        const agreeAt = isMarketingAgreed ? now : null;

        let agreement = await this.userAgreementRepository.findByUserIdAndTermId(
            userId,
            marketingTerm.id
        );

        if (!agreement) {
            agreement = UserAgreement.createMarketingAgreement(userId, isMarketingAgreed, agreeAt);
            agreement.termId = marketingTerm.id;
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

    async searchUsers(keyword?: string): Promise<UserWithSocialInfoProjection[]> {
        return this.userRepository.searchUsersWithSocialInfo(keyword);
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

    async findByIdOrThrow(userId: number): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    private async getMarketingConsent(userId: number): Promise<boolean> {
        const marketingAgreement = await this.userAgreementRepository.findByUserIdAndTermType(
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
