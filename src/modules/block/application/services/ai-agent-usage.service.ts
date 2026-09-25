import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { getSeoulDateString } from 'src/common/utils/seoul-date.util';
import { AiAgentUsageRepository } from '../../infrastructure/repositories/ai-agent-usage.repository';
import { AiAgentUsage } from '../../domain/ai-agent-usage.entity';

export const AI_AGENT_DAILY_LIMIT = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface AiAgentUsageSummary {
    used: number;
    limit: number;
    resetAt: Date;
}

@Injectable()
export class AiAgentUsageService {
    constructor(private readonly aiAgentUsageRepository: AiAgentUsageRepository) {}

    // 턴(request_id) 1회를 차감한다. 이미 차감된 request_id의 재시도는 다시 세지 않고,
    // 실패 처리된 request_id를 재시도하면 오늘 날짜로 다시 차감한다.
    // ponytail: 동시 발급 시 count→save 사이 경합으로 한도를 조금 넘길 수 있음. 문제되면 사용자 단위 advisory lock 추가
    async consume(userId: number, requestId: string, now: Date = new Date()): Promise<void> {
        const existing = await this.aiAgentUsageRepository.findByUserIdAndRequestId(
            userId,
            requestId
        );
        if (existing && !existing.failed) {
            return;
        }

        const today = getSeoulDateString(now);
        const used = await this.aiAgentUsageRepository.countUsed(userId, today);
        if (used >= AI_AGENT_DAILY_LIMIT) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED);
        }

        const usage = existing ?? new AiAgentUsage();
        usage.userId = userId;
        usage.requestId = requestId;
        usage.usageDate = today;
        usage.failed = false;
        await this.aiAgentUsageRepository.save(usage);
    }

    // AI 서버가 실패로 끝난 턴을 알려 오면 사용 횟수에서 제외한다. 없는 request_id는 무시한다(멱등).
    async markFailed(userId: number, requestId: string): Promise<void> {
        await this.aiAgentUsageRepository.markFailed(userId, requestId);
    }

    async getSummary(userId: number, now: Date = new Date()): Promise<AiAgentUsageSummary> {
        const today = getSeoulDateString(now);
        const used = await this.aiAgentUsageRepository.countUsed(userId, today);
        const resetAt = new Date(new Date(`${today}T00:00:00+09:00`).getTime() + ONE_DAY_MS);
        return { used, limit: AI_AGENT_DAILY_LIMIT, resetAt };
    }
}
