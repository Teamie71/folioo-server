import { Injectable } from '@nestjs/common';
import { UserProfileResDTO } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getProfile(userId: number): Promise<UserProfileResDTO> {
        const profile = await this.userRepository.findByIdWithProfile(userId);
        if (!profile) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return UserProfileResDTO.from(profile);
    }

    async deductCredit(userId: number, amount: number): Promise<void> {
        const result = await this.userRepository.deductCredit(userId, amount);
        if ((result.affected ?? 0) === 0) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDITS);
        }
    }
}
