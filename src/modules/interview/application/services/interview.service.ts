import { Inject, Injectable } from '@nestjs/common';
import { AiRelayConnection, AiRelayPort } from 'src/common/ports/ai-relay.port';
import {
    AiInterviewSessionStateResponse,
    InterviewSessionStateResDTO,
} from '../dtos/interview.dto';

const CREATE_SESSION_STREAM_PATH = '/api/v1/interview/sessions/stream';

@Injectable()
export class InterviewService {
    constructor(
        @Inject(AiRelayPort)
        private readonly aiRelayPort: AiRelayPort
    ) {}

    async createSessionStream(userId: number, experienceName: string): Promise<AiRelayConnection> {
        // TODO(interview): Add DB-backed pre-processing before relaying session-create request.
        return this.aiRelayPort.openPostStream({
            path: CREATE_SESSION_STREAM_PATH,
            body: {
                user_id: String(userId),
                experience_name: experienceName,
            },
        });
    }

    async sendChatStream(
        sessionId: string,
        message: string,
        mentionedInsightIds: number[]
    ): Promise<AiRelayConnection> {
        return this.aiRelayPort.openPostStream({
            path: `/api/v1/interview/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
            body: {
                message,
                mentioned_insight_ids: mentionedInsightIds,
            },
        });
    }

    async getSessionState(sessionId: string): Promise<InterviewSessionStateResDTO> {
        const response = await this.aiRelayPort.getJson<AiInterviewSessionStateResponse>({
            path: `/api/v1/interview/sessions/${encodeURIComponent(sessionId)}/state`,
        });

        return InterviewSessionStateResDTO.fromAiPayload(response.data);
    }
}
