import { Inject, Injectable } from '@nestjs/common';
import { AiSseRelayConnection, AiSseRelayPort } from 'src/common/ports/ai-sse-relay.port';
import { SendInterviewChatReqDTO } from '../dtos/interview.dto';

const CREATE_SESSION_STREAM_PATH = '/api/v1/interview/sessions/stream';

@Injectable()
export class InterviewService {
    constructor(
        @Inject(AiSseRelayPort)
        private readonly aiSseRelayPort: AiSseRelayPort
    ) {}

    async createSessionStream(
        userId: number,
        experienceName: string
    ): Promise<AiSseRelayConnection> {
        // TODO(interview): Add DB-backed pre-processing before relaying session-create request.
        return this.aiSseRelayPort.openPostStream({
            path: CREATE_SESSION_STREAM_PATH,
            body: {
                user_id: String(userId),
                experience_name: experienceName,
            },
        });
    }

    async sendChatStream(
        sessionId: string,
        dto: SendInterviewChatReqDTO
    ): Promise<AiSseRelayConnection> {
        return this.aiSseRelayPort.openPostStream({
            path: `/api/v1/interview/sessions/${encodeURIComponent(sessionId)}/chat/stream`,
            body: {
                message: dto.message,
                file_ids: dto.fileIds ?? [],
                mentioned_insight_ids: dto.insightIds ?? [],
            },
        });
    }
}
