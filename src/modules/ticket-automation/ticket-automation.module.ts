import { Module } from '@nestjs/common';
import { TicketModule } from '../ticket/ticket.module';
import { UserModule } from '../user/user.module';
import { WeeklyEventTicketScheduler } from './application/schedulers/weekly-event-ticket.scheduler';

@Module({
    imports: [UserModule, TicketModule],
    providers: [WeeklyEventTicketScheduler],
})
export class TicketAutomationModule {}
