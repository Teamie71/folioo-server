import { Injectable } from '@nestjs/common';
import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import { AiExperienceSessionRepository } from '../../infrastructure/repositories/ai-experience-session.repository';
import { AiExperienceSession } from '../../domain/ai-experience-session.entity';

interface CreateSessionAiResponse {
    session_id: string;
}

@Injectable()
export class AiExperienceSessionService {
    constructor(
        private readonly aiExperienceSessionRepository: AiExperienceSessionRepository,
        private readonly aiRelayPort: AiRelayPort
    ) {}

    async getOrCreate(userId: number): Promise<AiExperienceSession> {
        const existing = await this.aiExperienceSessionRepository.findByUserId(userId);
        if (existing) {
            return existing;
        }

        const response = await this.aiRelayPort.postJson<CreateSessionAiResponse>({
            path: '/sessions',
            body: { user_id: String(userId) },
        });

        const session = new AiExperienceSession();
        session.userId = userId;
        session.sessionId = response.data.session_id;
        return this.aiExperienceSessionRepository.save(session);
    }
}
