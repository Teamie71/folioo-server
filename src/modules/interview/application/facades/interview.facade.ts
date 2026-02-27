import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiSseRelayConnection } from 'src/common/ports/ai-sse-relay.port';
import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import { SendInterviewChatReqDTO } from '../dtos/interview.dto';
import { InterviewService } from '../services/interview.service';

@Injectable()
export class InterviewFacade {
    constructor(
        private readonly interviewService: InterviewService,
        private readonly experienceService: ExperienceService
    ) {}

    async createSessionStream(userId: number, experienceId: number): Promise<AiSseRelayConnection> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        const relayConnection = await this.interviewService.createSessionStream(
            userId,
            experience.name
        );

        const sessionId = this.extractSessionId(relayConnection.responseHeaders);
        if (!sessionId) {
            relayConnection.close();
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, {
                reason: 'x-session-id header is missing from AI response',
            });
        }

        try {
            await this.experienceService.saveInterviewSessionId(experience, sessionId);
        } catch (error) {
            relayConnection.close();
            throw error;
        }

        return relayConnection;
    }

    async sendChatStream(
        userId: number,
        experienceId: number,
        dto: SendInterviewChatReqDTO
    ): Promise<AiSseRelayConnection> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        if (!experience.sessionId) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'interview session id is not initialized for this experience',
                experienceId,
            });
        }

        return this.interviewService.sendChatStream(experience.sessionId, dto);
    }

    private extractSessionId(headers?: Record<string, string>): string | null {
        if (!headers) {
            return null;
        }

        const rawSessionId = headers['x-session-id'];
        if (!rawSessionId) {
            return null;
        }

        const normalizedSessionId = rawSessionId.split(',')[0]?.trim();
        return normalizedSessionId || null;
    }
}
