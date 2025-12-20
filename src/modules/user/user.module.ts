import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './domain/orm/user.orm-entity';
import { UserService } from './application/user.service';
import { USER_AUTH_PORT } from '../auth/application/ports/user-auth.port';
import { UserRepository } from './infra/user.repository';

@Module({
    imports: [TypeOrmModule.forFeature([UserOrmEntity])],
    providers: [UserRepository, UserService, { provide: USER_AUTH_PORT, useExisting: UserService }],
})
export class UserModule {}
