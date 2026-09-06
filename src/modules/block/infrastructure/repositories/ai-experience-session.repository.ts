import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExperienceSession } from '../../domain/ai-experience-session.entity';

@Injectable()
export class AiExperienceSessionRepository {
    constructor(
        @InjectRepository(AiExperienceSession)
        private readonly aiExperienceSessionRepository: Repository<AiExperienceSession>
    ) {}

    findByUserId(userId: number): Promise<AiExperienceSession | null> {
        return this.aiExperienceSessionRepository.findOne({ where: { userId } });
    }

    save(entity: AiExperienceSession): Promise<AiExperienceSession> {
        return this.aiExperienceSessionRepository.save(entity);
    }
}
