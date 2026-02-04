import { Injectable } from '@nestjs/common';
import { UserProfileResDto } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getProfile(userId: number): Promise<UserProfileResDto> {
        const profile = await this.userRepository.findByIdWithProfile(userId);
        if (!profile) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return UserProfileResDto.from(profile);
    }
}
