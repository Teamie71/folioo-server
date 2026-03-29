import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiRelayConnection } from 'src/common/ports/ai-relay.port';
import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import { Experience } from 'src/modules/experience/domain/experience.entity';
import { GeneratePortfolioResDTO } from 'src/modules/experience/application/dtos/experience.dto';
import { InsightService } from 'src/modules/insight/application/services/insight.service';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import {
    InterviewInternalDTO,
    InterviewSessionStateResDTO,
    SendInterviewChatReqDTO,
} from '../dtos/interview.dto';
import { InterviewService } from '../services/interview.service';

@Injectable()
export class InterviewFacade {
    private readonly logger = new Logger(InterviewFacade.name);

    constructor(
        private readonly interviewService: InterviewService,
        private readonly experienceService: ExperienceService,
        private readonly insightService: InsightService,
        private readonly portfolioService: PortfolioService
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
        const { sessionId } = await this.getInitializedSession(userId, experienceId);

        if (dto.insightId) {
            await this.insightService.findByIdAndUserOrThrow(dto.insightId, userId);
        }

        return this.interviewService.sendChatStream(sessionId, dto.message, dto.insightId);
    }

    async getSessionState(
        userId: number,
        experienceId: number
    ): Promise<InterviewSessionStateResDTO> {
        const { sessionId } = await this.getInitializedSession(userId, experienceId);

        return this.interviewService.getSessionState(sessionId);
    }

    async extendSessionStream(userId: number, experienceId: number): Promise<AiRelayConnection> {
        const { sessionId } = await this.getInitializedSession(userId, experienceId);

        const sessionState = await this.interviewService.getSessionState(sessionId);
        if (!sessionState.allComplete) {
            throw new BusinessException(ErrorCode.INTERVIEW_EXTEND_NOT_ALLOWED);
        }

        return this.interviewService.extendSessionStream(sessionId);
    }

    private async getInitializedSession(
        userId: number,
        experienceId: number
    ): Promise<{ sessionId: string; experience: InterviewInternalDTO }> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);
        const interviewInternalDTO = InterviewInternalDTO.of(experience);

        if (!interviewInternalDTO.sessionId) {
            throw new BusinessException(ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED, {
                reason: 'interview session id is not initialized for this experience',
                experienceId,
            });
        }

        return { sessionId: interviewInternalDTO.sessionId, experience: interviewInternalDTO };
    }

    async generatePortfolio(
        experienceId: number,
        userId: number
    ): Promise<GeneratePortfolioResDTO> {
        const experience = await this.experienceService.findByIdOrThrow(experienceId, userId);

        if (!experience.sessionId) {
            throw new BusinessException(ErrorCode.EXPERIENCE_SESSION_NOT_READY, { experienceId });
        }

        const sessionState = await this.interviewService.getSessionState(experience.sessionId);
        if (!sessionState.allComplete) {
            throw new BusinessException(ErrorCode.INTERVIEW_NOT_COMPLETED);
        }

        const result = await this.executePortfolioGeneration(experience, userId);

        try {
            await this.interviewService.delegatePortfolioGeneration(
                result.portfolioId,
                experience.sessionId,
                String(userId)
            );
        } catch (error) {
            await this.compensateFailedDelegation(result.portfolioId, experienceId, error);
            throw new BusinessException(ErrorCode.INTERVIEW_AI_RELAY_FAILED, {
                reason: 'Failed to delegate portfolio generation to AI server',
                portfolioId: result.portfolioId,
            });
        }

        return result;
    }

    @Transactional()
    private async executePortfolioGeneration(
        experience: Experience,
        userId: number
    ): Promise<GeneratePortfolioResDTO> {
        const updatedExperience = await this.experienceService.transitionToGenerate(experience);

        const portfolio = Portfolio.createInternal(userId, experience.id, experience.name);
        const savedPortfolio = await this.portfolioService.savePortfolio(portfolio);

        return GeneratePortfolioResDTO.of(
            savedPortfolio.id,
            savedPortfolio.status,
            updatedExperience.status
        );
    }

    @Transactional()
    private async compensateFailedDelegation(
        portfolioId: number,
        experienceId: number,
        originalError: unknown
    ): Promise<void> {
        const errorDetail =
            originalError instanceof Error ? originalError.message : String(originalError);
        this.logger.error(
            `AI delegation failed for portfolioId=${portfolioId}, experienceId=${experienceId}. ` +
                `Running compensation. Cause: ${errorDetail}`
        );

        try {
            await Promise.all([
                this.portfolioService.removeGeneratingPortfolio(portfolioId),
                this.experienceService.transitionToGenerateFailed(experienceId),
            ]);
            this.logger.log(
                `Compensation completed: portfolioId=${portfolioId}, experienceId=${experienceId}`
            );
        } catch (compensationError) {
            const stack = compensationError instanceof Error ? compensationError.stack : undefined;
            this.logger.error(
                `Compensation FAILED for portfolioId=${portfolioId}, experienceId=${experienceId}. ` +
                    `Manual intervention required.`,
                stack
            );
        }
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
