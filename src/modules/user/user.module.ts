import { Module } from '@nestjs/common';
import { UserController } from './presentation/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserService } from './application/services/user.service';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [UserController],
    providers: [UserRepository, UserService],
    exports: [UserRepository, UserService],
})
export class UserModule {}
