import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { JobSearchSessionRepository } from '../../infrastructure/repositories/job-search-session.repository';
import { JobSearchSession } from '../../domain/job-search-session.entity';
import { JobSearchStatus } from '../../domain/enums/job-search-status.enum';
import { ALL_VALUE_KINDS, ValueKind } from '../../domain/enums/value-kind.enum';
import { NextComparison, computeWeights, replay } from '../../domain/value-balance-algorithm';

export interface ValueBalanceProgress {
    token: string;
    isComplete: boolean;
    next: NextComparison | null;
    ranking: ValueKind[] | null;
    weights: Partial<Record<ValueKind, number>> | null;
}

@Injectable()
export class JobSearchSessionService {
    constructor(private readonly jobSearchSessionRepository: JobSearchSessionRepository) {}

    async startValueBalance(userId: number | null): Promise<ValueBalanceProgress> {
        const insertionOrder = shuffle(ALL_VALUE_KINDS);
        const session = JobSearchSession.create(userId, insertionOrder);
        const state = replay(insertionOrder, []);
        const saved = await this.jobSearchSessionRepository.save(session);

        return {
            token: saved.id,
            isComplete: state.isComplete,
            next: state.next,
            ranking: state.isComplete ? state.sorted : null,
            weights: null,
        };
    }

    async answerValueBalance(
        token: string,
        sequence: number,
        chosen: ValueKind
    ): Promise<ValueBalanceProgress> {
        const session = await this.findByIdOrThrow(token);
        if (session.status !== JobSearchStatus.VALUES_IN_PROGRESS) {
            throw new BusinessException(ErrorCode.JOB_SEARCH_VALUES_ALREADY_COMPLETED);
        }
        if (sequence < 0 || sequence > session.valuesAnswerLog.length) {
            throw new BusinessException(ErrorCode.JOB_SEARCH_INVALID_SEQUENCE);
        }

        // sequence가 기존 로그 길이보다 작으면 "이전 응답 수정" — 그 지점 이후 로그는 폐기하고
        // 다시 재생한다. sequence가 로그 길이와 같으면 새 답변이다.
        const truncatedLog = session.valuesAnswerLog.slice(0, sequence);
        const stateBeforeAnswer = replay(session.valuesInsertionOrder, truncatedLog);
        if (stateBeforeAnswer.isComplete || !stateBeforeAnswer.next) {
            throw new BusinessException(ErrorCode.JOB_SEARCH_INVALID_SEQUENCE);
        }

        const { left, right } = stateBeforeAnswer.next;
        if (chosen !== left && chosen !== right) {
            throw new BusinessException(ErrorCode.JOB_SEARCH_INVALID_ANSWER);
        }

        const newLog = [...truncatedLog, { sequence, left, right, chosen }];
        const newState = replay(session.valuesInsertionOrder, newLog);

        if (newState.isComplete) {
            const weights = computeWeights(newState.sorted);
            session.completeValues(newState.sorted, weights);
            await this.jobSearchSessionRepository.save(session);
            return {
                token: session.id,
                isComplete: true,
                next: null,
                ranking: newState.sorted,
                weights,
            };
        }

        session.valuesAnswerLog = newLog;
        await this.jobSearchSessionRepository.save(session);
        return {
            token: session.id,
            isComplete: false,
            next: newState.next,
            ranking: null,
            weights: null,
        };
    }

    async getStatusForUser(userId: number): Promise<JobSearchSession | null> {
        return this.jobSearchSessionRepository.findLatestReadyByUserId(userId);
    }

    private async findByIdOrThrow(token: string): Promise<JobSearchSession> {
        const session = await this.jobSearchSessionRepository.findById(token);
        if (!session) {
            throw new BusinessException(ErrorCode.JOB_SEARCH_NOT_FOUND);
        }
        return session;
    }
}

function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
