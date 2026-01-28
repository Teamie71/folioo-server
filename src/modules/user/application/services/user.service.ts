import { Injectable } from '@nestjs/common';
import { UserProfileResDto } from '../dtos/user-profile.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async getProfile(userId: number): Promise<UserProfileResDto> {
        const profile = await this.userRepository.findByIdWithProfile(userId);
        return UserProfileResDto.from(profile);
    }
}
