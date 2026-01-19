import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/user.entity';
import { Repository } from 'typeorm';
import { LoginType } from '../../domain/enums/login-type.enum';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async save(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async findBySocialIdAndSocialType(
        socialId: string,
        socialType: LoginType
    ): Promise<User | null> {
        return await this.userRepository.findOne({
            where: {
                socialId,
                socialType,
            },
        });
    }
}
