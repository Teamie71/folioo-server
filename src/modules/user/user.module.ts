import { Module } from '@nestjs/common';
import { UserController } from './presentation/user.controller';

@Module({
    imports: [],
    controllers: [UserController],
})
export class UserModule {}
