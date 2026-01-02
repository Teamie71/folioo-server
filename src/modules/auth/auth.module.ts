import { Module } from '@nestjs/common';
import { AuthController } from './presentation/auth.controller';

@Module({
    imports: [],
    controllers: [AuthController],
})
export class AuthModule {}
