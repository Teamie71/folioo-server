import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { CreateCorrectionReqDTO } from '../dtos/portfolio-correction.dto';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';

@Injectable()
export class PortfolioCorrectionFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly ticketService: TicketService
    ) {}

    @Transactional()
    async requestCorrection(userId: number, body: CreateCorrectionReqDTO): Promise<void> {
        await this.ticketService.consumeTicket(userId, TicketType.PORTFOLIO_CORRECTION);
        await this.portfolioCorrectionService.validateCreation(userId);
        await this.portfolioCorrectionService.createCorrection(
            userId,
            body.companyName,
            body.positionName,
            body.jobDescription ?? '',
            body.jobDescriptionType
        );
    }
}
