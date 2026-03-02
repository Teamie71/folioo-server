import { Module, forwardRef } from '@nestjs/common';
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
import { UserAuthFacade } from './application/facades/user-auth.facade';
import { SocialAccountUnlinkClient } from './infrastructure/clients/social-account-unlink.client';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, SocialUser, UserAgreement]),
        TicketModule,
        forwardRef(() => AuthModule),
    ],
    controllers: [UserController],
    providers: [
        UserRepository,
        SocialUserRepository,
        UserAgreementRepository,
        SocialAccountUnlinkClient,
        UserService,
        UserTicketFacade,
        UserAuthFacade,
    ],
    exports: [UserRepository, SocialUserRepository, UserService],
})
export class UserModule {}
