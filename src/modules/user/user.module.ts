import { Module } from '@nestjs/common';
import { UserController } from './presentation/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { SocialUser } from './domain/social-user.entity';
import { UserAgreement } from './domain/user-agreement.entity';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { UserAgreementRepository } from './infrastructure/repositories/user-agreement.repository';
import { SocialUserRepository } from './infrastructure/repositories/social-user.repository';
import { UserService } from './application/services/user.service';
import { TicketModule } from '../ticket/ticket.module';
import { UserTicketFacade } from './application/facades/user-ticket.facade';

@Module({
    imports: [TypeOrmModule.forFeature([User, SocialUser, UserAgreement]), TicketModule],
    controllers: [UserController],
    providers: [
        UserRepository,
        SocialUserRepository,
        UserAgreementRepository,
        UserService,
        UserTicketFacade,
    ],
    exports: [UserRepository, SocialUserRepository, UserService],
})
export class UserModule {}
