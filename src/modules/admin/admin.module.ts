import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { EventModule } from '../event/event.module';
import { TicketModule } from '../ticket/ticket.module';
import { AdminEventRewardController } from './presentation/admin-event-reward.controller';
import { AdminEventRewardFacade } from './application/facades/admin-event-reward.facade';

@Module({
    imports: [UserModule, EventModule, TicketModule],
    controllers: [AdminEventRewardController],
    providers: [AdminEventRewardFacade],
})
export class AdminModule {}
