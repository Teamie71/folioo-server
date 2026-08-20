import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCommitRequest } from '../../domain/ai-commit-request.entity';

@Injectable()
export class AiCommitRequestRepository {
    constructor(
        @InjectRepository(AiCommitRequest)
        private readonly aiCommitRequestRepository: Repository<AiCommitRequest>
    ) {}

    findByUserIdAndRequestId(userId: number, requestId: string): Promise<AiCommitRequest | null> {
        return this.aiCommitRequestRepository.findOne({ where: { userId, requestId } });
    }

    save(entity: AiCommitRequest): Promise<AiCommitRequest> {
        return this.aiCommitRequestRepository.save(entity);
    }
}
