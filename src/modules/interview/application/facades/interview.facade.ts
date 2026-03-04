import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiRelayConnection } from 'src/common/ports/ai-relay.port';
import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import { InsightService } from 'src/modules/insight/application/services/insight.service';
import {
    InterviewInternalDTO,
    InterviewSessionStateResDTO,
    SendInterviewChatReqDTO,
} from '../dtos/interview.dto';
import { InterviewService } from '../services/interview.service';

@Injectable()
export class InterviewFacade {
    constructor(
        private readonly interviewService: InterviewService,
        private readonly experienceService: ExperienceService,
        private readonly insightService: InsightService
    ) {}

    async createSessionStream(userId: number, experienceId: number): Promise<AiRelayConnection> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        const interviewInternalDTO = InterviewInternalDTO.of(experience);
        if (interviewInternalDTO.sessionId) {
            throw new BusinessException(ErrorCode.EXPERIENCE_SESSION_ALREADY_EXISTS, {
                experienceId,
            });
        }

        const relayConnection = await this.interviewService.createSessionStream(
            userId,
            interviewInternalDTO.experienceName
        );

        const sessionId = this.extractSessionId(relayConnection.responseHeaders);
        if (!sessionId) {
            relayConnection.close();
            throw new BusinessException(ErrorCode.INTERVIEW_AI_RELAY_FAILED, {
                reason: 'x-session-id header is missing from AI response',
            });
        }

        try {
            await this.experienceService.saveInterviewSessionId(
                interviewInternalDTO.experienceId,
                userId,
                sessionId
            );
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
    ): Promise<AiRelayConnection> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        const interviewInternalDTO = InterviewInternalDTO.of(experience);
        if (!interviewInternalDTO.sessionId) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED, {
                reason: 'interview session id is not initialized for this experience',
                experienceId,
            });
        }

        const validatedInsightIds = await this.resolveInsightIds(userId, dto.insightId);

        return this.interviewService.sendChatStream(
            interviewInternalDTO.sessionId,
            dto.message,
            validatedInsightIds
        );
    }

    private async resolveInsightIds(userId: number, insightId?: number): Promise<number[]> {
        if (!insightId) {
            return [];
        }

        await this.insightService.findByIdAndUserOrThrow(insightId, userId);
        return [];
        // TODO: AI 서버 측 스펙 변경 이후 코드 수정
        //return [insightId];
    }

    async getSessionState(
        userId: number,
        experienceId: number
    ): Promise<InterviewSessionStateResDTO> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        const interviewInternalDTO = InterviewInternalDTO.of(experience);

        if (!interviewInternalDTO.sessionId) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED, {
                reason: 'interview session id is not initialized for this experience',
                experienceId,
            });
        }

        return this.interviewService.getSessionState(interviewInternalDTO.sessionId);
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
