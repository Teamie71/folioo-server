import { Injectable } from '@nestjs/common';
import { AiCommitLogRepository } from '../../infrastructure/repositories/ai-commit-log.repository';
import { AiCommitLog } from '../../domain/ai-commit-log.entity';

export interface RecordCommitInput {
    requestId: string;
    previousVersion: string;
    committedVersion: string;
    createdBlockIds: string[];
    updatedBlocks: Record<string, string | null>;
}

@Injectable()
export class AiCommitLogService {
    constructor(private readonly aiCommitLogRepository: AiCommitLogRepository) {}

    // 사용자가 블록을 직접 수정하면 AI 커밋은 더 이상 되돌릴 수 없으므로,
    // 되돌리기 대상 기록을 폐기한다 (만료만 기다리는 죽은 데이터로 남기지 않는다).
    async discardByUserId(userId: number): Promise<void> {
        await this.aiCommitLogRepository.deleteByUserId(userId);
    }

    // 사용자당 최신 1건만 남기는 되돌리기 스냅샷. AI 커밋 시마다 덮어쓴다.
    async recordCommit(userId: number, input: RecordCommitInput): Promise<void> {
        const existing = await this.aiCommitLogRepository.findByUserId(userId);
        const log = existing ?? new AiCommitLog();
        log.userId = userId;
        log.requestId = input.requestId;
        log.previousVersion = input.previousVersion;
        log.committedVersion = input.committedVersion;
        log.createdBlockIds = input.createdBlockIds;
        log.updatedBlocks = input.updatedBlocks;
        await this.aiCommitLogRepository.save(log);
    }
}
