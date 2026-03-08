import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './domain/entities/ticket.entity';
import { TicketGrantNotice } from './domain/entities/ticket-grant-notice.entity';
import { TicketGrant } from './domain/entities/ticket-grant.entity';
import { TicketProduct } from './domain/entities/ticket-product.entity';
import { TicketGrantFacade } from './application/facades/ticket-grant.facade';
import { TicketGrantNoticeService } from './application/services/ticket-grant-notice.service';
import { TicketGrantService } from './application/services/ticket-grant.service';
import { TicketRepository } from './infrastructure/repositories/ticket.repository';
import { TicketGrantNoticeRepository } from './infrastructure/repositories/ticket-grant-notice.repository';
import { TicketGrantRepository } from './infrastructure/repositories/ticket-grant.repository';
import { TicketProductRepository } from './infrastructure/repositories/ticket-product.repository';
import { TicketService } from './application/services/ticket.service';
import { TicketProductService } from './application/services/ticket-product.service';
import { TicketProductSeedService } from './application/services/ticket-product-seed.service';
import { TicketController } from './presentation/ticket.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket, TicketProduct, TicketGrant, TicketGrantNotice])],
    controllers: [TicketController],
    providers: [
        TicketRepository,
        TicketGrantRepository,
        TicketGrantNoticeRepository,
        TicketProductRepository,
        TicketService,
        TicketGrantService,
        TicketGrantNoticeService,
        TicketGrantFacade,
        TicketProductService,
        TicketProductSeedService,
    ],
    exports: [TicketService, TicketProductService, TicketGrantFacade],
})
export class TicketModule {}
