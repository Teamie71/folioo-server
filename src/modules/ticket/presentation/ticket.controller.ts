import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TicketService } from '../application/services/ticket.service';
import { TicketProductService } from '../application/services/ticket-product.service';

@ApiTags('Ticket')
@Controller('tickets')
export class TicketController {
    constructor(
        private readonly ticketService: TicketService,
        private readonly ticketProductService: TicketProductService
    ) {}
}
