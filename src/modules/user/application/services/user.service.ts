import { Injectable } from '@nestjs/common';
import { UserProfileResDTO } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from '../../domain/user.entity';

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

    async findByPhoneNumOrThrow(phoneNum: string): Promise<User> {
        const user = await this.userRepository.findByPhoneNum(phoneNum);
        if (!user) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return user;
    }
}
