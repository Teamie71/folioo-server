import { Injectable } from '@nestjs/common';
import { UserProfileResDTO } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from '../../domain/user.entity';
import { UserAgreementRepository } from '../../infrastructure/repositories/user-agreement.repository';
import { SocialUserRepository } from '../../infrastructure/repositories/social-user.repository';
import { TermType } from '../../domain/enums/term-type.enum';
import { UserAgreement } from '../../domain/user-agreement.entity';
import { AgreeMarketingResDTO } from '../dtos/marketing-agree.dto';

const DEFAULT_TERMS_VERSION = 'v1.0';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userAgreementRepository: UserAgreementRepository,
        private readonly socialUserRepository: SocialUserRepository
    ) {}

    async getProfile(userId: number): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        const email = await this.socialUserRepository.findLatestEmailByUserId(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, email, isMarketingAgreed);
    }

    async updateProfile(userId: number, name: string): Promise<UserProfileResDTO> {
        const user = await this.findByIdOrThrow(userId);
        user.name = name;
        await this.userRepository.save(user);
        const email = await this.socialUserRepository.findLatestEmailByUserId(userId);
        const isMarketingAgreed = await this.getMarketingConsent(userId);
        return UserProfileResDTO.from(user, email, isMarketingAgreed);
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

    async findByPhoneNumOrThrow(phoneNum: string): Promise<User> {
        const user = await this.userRepository.findByPhoneNum(phoneNum);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
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
}
