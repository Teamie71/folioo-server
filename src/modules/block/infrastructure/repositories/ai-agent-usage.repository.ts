import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAgentUsage } from '../../domain/ai-agent-usage.entity';

@Injectable()
export class AiAgentUsageRepository {
    constructor(
        @InjectRepository(AiAgentUsage)
        private readonly aiAgentUsageRepository: Repository<AiAgentUsage>
    ) {}

    findByUserIdAndRequestId(userId: number, requestId: string): Promise<AiAgentUsage | null> {
        return this.aiAgentUsageRepository.findOne({ where: { userId, requestId } });
    }

    countUsed(userId: number, usageDate: string): Promise<number> {
        return this.aiAgentUsageRepository.count({ where: { userId, usageDate, failed: false } });
    }

    save(entity: AiAgentUsage): Promise<AiAgentUsage> {
        return this.aiAgentUsageRepository.save(entity);
    }

    async markFailed(userId: number, requestId: string): Promise<void> {
        await this.aiAgentUsageRepository.update({ userId, requestId }, { failed: true });
    }
}
