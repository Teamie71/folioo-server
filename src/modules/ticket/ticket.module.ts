import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './domain/entities/ticket.entity';
import { TicketProduct } from './domain/entities/ticket-product.entity';
import { TicketRepository } from './infrastructure/repositories/ticket.repository';
import { TicketProductRepository } from './infrastructure/repositories/ticket-product.repository';
import { TicketService } from './application/services/ticket.service';
import { TicketProductService } from './application/services/ticket-product.service';
import { TicketController } from './presentation/ticket.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket, TicketProduct])],
    controllers: [TicketController],
    providers: [TicketRepository, TicketProductRepository, TicketService, TicketProductService],
    exports: [TicketService, TicketProductService],
})
export class TicketModule {}
