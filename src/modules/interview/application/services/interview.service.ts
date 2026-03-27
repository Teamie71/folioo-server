import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiRelayConnection, AiRelayPort } from 'src/common/ports/ai-relay.port';
import { InterviewChatUploadFile } from '../../presentation/services/interview-chat-stream-request-parser.service';
import {
    AiInterviewSessionStateResponse,
    InterviewSessionStateResDTO,
} from '../dtos/interview.dto';

const CREATE_SESSION_STREAM_PATH = '/api/v1/interview/sessions/stream';
const SESSION_BASE_PATH = '/api/v1/interview/sessions';

const sessionPath = (sessionId: string, suffix: string): string =>
    `${SESSION_BASE_PATH}/${encodeURIComponent(sessionId)}${suffix}`;

@Injectable()
export class InterviewService {
    private readonly logger = new Logger(InterviewService.name);

    constructor(
        @Inject(AiRelayPort)
        private readonly aiRelayPort: AiRelayPort
    ) {}

    async createSessionStream(userId: number, experienceName: string): Promise<AiRelayConnection> {
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
        mentionedInsightId?: number,
        file?: InterviewChatUploadFile
    ): Promise<AiRelayConnection> {
        const formData = new FormData();
        formData.append('message', message);
        if (mentionedInsightId !== undefined) {
            formData.append('mentioned_insight', mentionedInsightId.toString());
        }

        if (file) {
            const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimeType });
            formData.append('files', blob, file.fileName);
        }

        return this.aiRelayPort.openPostStream({
            path: sessionPath(sessionId, '/chat/stream'),
            body: formData,
        });
    }

    async extendSessionStream(sessionId: string): Promise<AiRelayConnection> {
        return this.aiRelayPort.openPostStream({
            path: sessionPath(sessionId, '/extend/stream'),
            body: {},
        });
    }

    async getSessionState(sessionId: string): Promise<InterviewSessionStateResDTO> {
        const response = await this.aiRelayPort.getJson<AiInterviewSessionStateResponse>({
            path: sessionPath(sessionId, '/state'),
        });

        return InterviewSessionStateResDTO.fromAiPayload(response.data);
    }

    async delegatePortfolioGeneration(
        portfolioId: number,
        sessionId: string,
        userId: string
    ): Promise<void> {
        await this.aiRelayPort.postJson({
            path: '/api/v1/portfolio/generate',
            body: {
                portfolio_id: portfolioId,
                session_id: sessionId,
                user_id: userId,
            },
        });
    }
}
