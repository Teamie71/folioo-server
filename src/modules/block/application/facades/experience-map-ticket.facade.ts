import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Transactional } from 'typeorm-transactional';
import { BlockService } from '../services/block.service';
import { AiExperienceSessionService } from '../services/ai-experience-session.service';
import { ExperienceMapTicketService } from '../services/experience-map-ticket.service';
import { IssueTicketResDTO } from '../dtos/experience-map-ticket.dto';

@Injectable()
export class ExperienceMapTicketFacade {
    constructor(
        private readonly blockService: BlockService,
        private readonly aiExperienceSessionService: AiExperienceSessionService,
        private readonly experienceMapTicketService: ExperienceMapTicketService
    ) {}

    @Transactional()
    async issueTicket(
        userId: number,
        blockId: string,
        retryRequestId?: string
    ): Promise<IssueTicketResDTO> {
        await this.blockService.findExperienceOrThrow(blockId, userId);
        const session = await this.aiExperienceSessionService.getOrCreate(userId, blockId);
        const requestId = retryRequestId ?? randomUUID();
        const { ticket, expiresIn } = this.experienceMapTicketService.issueTicket(
            userId,
            session.sessionId,
            blockId
        );
        return IssueTicketResDTO.from(ticket, session.sessionId, requestId, expiresIn);
    }
}
