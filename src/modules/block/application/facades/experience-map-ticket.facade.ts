import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Transactional } from 'typeorm-transactional';
import { BlockService } from '../services/block.service';
import { ExperienceMapService } from '../services/experience-map.service';
import { AiExperienceSessionService } from '../services/ai-experience-session.service';
import { ExperienceMapTicketService } from '../services/experience-map-ticket.service';
import { IssueTicketResDTO } from '../dtos/experience-map-ticket.dto';
import { BlockKind } from '../../domain/enums/block-kind.enum';

const INITIAL_GROUP_CONTENT = '새로운 그룹 1';
const INITIAL_EXPERIENCE_CONTENT = '새로운 활동 1';

@Injectable()
export class ExperienceMapTicketFacade {
    constructor(
        private readonly blockService: BlockService,
        private readonly experienceMapService: ExperienceMapService,
        private readonly aiExperienceSessionService: AiExperienceSessionService,
        private readonly experienceMapTicketService: ExperienceMapTicketService
    ) {}

    @Transactional()
    async issueTicket(userId: number, retryRequestId?: string): Promise<IssueTicketResDTO> {
        await this.ensureInitialData(userId);
        const session = await this.aiExperienceSessionService.getOrCreate(userId);
        const requestId = retryRequestId ?? randomUUID();
        const { ticket, expiresIn } = this.experienceMapTicketService.issueTicket(
            userId,
            session.sessionId
        );
        return IssueTicketResDTO.from(ticket, session.sessionId, requestId, expiresIn);
    }

    // 신규 사용자: 미분류 루트 + 그룹 1 + 활동 1(하위 SECTION 5·기본 CONTENT 슬롯 18개 자동 생성)
    // = 총 26블록. EXPERIENCE 생성 시 provisionExperienceScaffold가 나머지를 만들어 준다.
    private async ensureInitialData(userId: number): Promise<void> {
        const existing = await this.experienceMapService.tryFind(userId);
        if (existing) {
            return;
        }

        await this.blockService.getOrCreateRootBlock(userId);
        const group = await this.blockService.createBlock(
            userId,
            BlockKind.GROUP,
            null,
            INITIAL_GROUP_CONTENT
        );
        await this.blockService.createBlock(
            userId,
            BlockKind.EXPERIENCE,
            group.id,
            INITIAL_EXPERIENCE_CONTENT
        );
        await this.experienceMapService.getOrCreate(userId);
    }
}
