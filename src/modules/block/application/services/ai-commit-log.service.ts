import { Injectable } from '@nestjs/common';
import { AiCommitLogRepository } from '../../infrastructure/repositories/ai-commit-log.repository';

@Injectable()
export class AiCommitLogService {
    constructor(private readonly aiCommitLogRepository: AiCommitLogRepository) {}

    // 사용자가 블록을 직접 수정하면 AI 커밋은 더 이상 되돌릴 수 없으므로,
    // 되돌리기 대상 기록을 폐기한다 (만료만 기다리는 죽은 데이터로 남기지 않는다).
    async discardByUserId(userId: number): Promise<void> {
        await this.aiCommitLogRepository.deleteByUserId(userId);
    }
}
