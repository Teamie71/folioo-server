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

    findByUserIdAndBlockId(userId: number, blockId: string): Promise<AiExperienceSession | null> {
        return this.aiExperienceSessionRepository.findOne({ where: { userId, blockId } });
    }

    save(entity: AiExperienceSession): Promise<AiExperienceSession> {
        return this.aiExperienceSessionRepository.save(entity);
    }
}
