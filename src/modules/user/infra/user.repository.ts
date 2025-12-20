import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginType, UserOrmEntity } from '../domain/orm/user.orm-entity';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(UserOrmEntity)
        private readonly repo: Repository<UserOrmEntity>
    ) {}

    findBySocial(loginType: LoginType, loginId: string) {
        return this.repo.findOne({ where: { loginType, loginId } });
    }

    findById(id: number) {
        return this.repo.findOne({ where: { id } });
    }

    save(user: UserOrmEntity) {
        return this.repo.save(user);
    }

    create(data: Partial<UserOrmEntity>) {
        return this.repo.create(data);
    }

    async deactivate(id: number) {
        await this.repo.update({ id }, { isActive: false });
    }
}
