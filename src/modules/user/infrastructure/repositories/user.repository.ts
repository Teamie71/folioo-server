import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async save(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
        });
    }

    async findByPhoneNum(phoneNum: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                phoneNum,
            },
        });
    }

    async findByIdWithProfile(userId: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                id: userId,
            },
            select: {
                name: true,
                phoneNum: true,
            },
        });
    }
}
