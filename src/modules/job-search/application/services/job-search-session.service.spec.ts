import { BusinessException } from 'src/common/exceptions/business.exception';
import { JobSearchSessionService } from './job-search-session.service';
import { JobSearchSessionRepository } from '../../infrastructure/repositories/job-search-session.repository';
import { JobSearchSession, ValueComparisonLogEntry } from '../../domain/job-search-session.entity';
import { JobSearchStatus } from '../../domain/enums/job-search-status.enum';
import { ValueKind } from '../../domain/enums/value-kind.enum';

const { REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE } = ValueKind;

class JobSearchSessionRepositoryStub {
    readonly save = jest.fn<Promise<JobSearchSession>, [JobSearchSession]>();
    readonly findById = jest.fn<Promise<JobSearchSession | null>, [string]>();
    readonly findLatestReadyByUserId = jest.fn<Promise<JobSearchSession | null>, [number]>();
}

const createSession = (overrides: Partial<JobSearchSession> = {}): JobSearchSession => {
    const session = JobSearchSession.create(
        overrides.userId ?? null,
        overrides.valuesInsertionOrder ?? [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE]
    );
    session.id = overrides.id ?? 'session-1';
    session.status = overrides.status ?? session.status;
    session.valuesAnswerLog = overrides.valuesAnswerLog ?? session.valuesAnswerLog;
    session.result = overrides.result ?? null;
    session.resultExpiresAt = overrides.resultExpiresAt ?? null;
    return session;
};

describe('JobSearchSessionService', () => {
    let service: JobSearchSessionService;
    let repository: JobSearchSessionRepositoryStub;

    beforeEach(() => {
        repository = new JobSearchSessionRepositoryStub();
        service = new JobSearchSessionService(repository as unknown as JobSearchSessionRepository);
    });

    describe('startValueBalance', () => {
        it('creates a session with a shuffled insertion order and returns the first question', async () => {
            repository.save.mockImplementation((session) => Promise.resolve(session));

            const progress = await service.startValueBalance(null);

            expect(repository.save).toHaveBeenCalledTimes(1);
            const savedSession = repository.save.mock.calls[0][0];
            expect(savedSession.valuesInsertionOrder).toHaveLength(5);
            expect(new Set(savedSession.valuesInsertionOrder)).toEqual(
                new Set([REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE])
            );
            expect(progress.isComplete).toBe(false);
            expect(progress.next).not.toBeNull();
            expect(progress.next?.sequence).toBe(0);
        });

        it('tags the session with userId when provided', async () => {
            repository.save.mockImplementation((session) => Promise.resolve(session));

            await service.startValueBalance(7);

            const savedSession = repository.save.mock.calls[0][0];
            expect(savedSession.userId).toBe(7);
        });
    });

    describe('answerValueBalance', () => {
        it('throws JOB_SEARCH_NOT_FOUND when the token does not exist', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.answerValueBalance('missing', 0, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects answering when the values-balance game is already completed', async () => {
            const session = createSession({ status: JobSearchStatus.VALUES_DONE });
            repository.findById.mockResolvedValue(session);

            await expect(service.answerValueBalance(session.id, 0, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects a sequence further ahead than the current log', async () => {
            const session = createSession();
            repository.findById.mockResolvedValue(session);

            await expect(service.answerValueBalance(session.id, 5, REWARD)).rejects.toThrow(
                BusinessException
            );
        });

        it('rejects a chosen value that is not part of the expected pair', async () => {
            const session = createSession({
                valuesInsertionOrder: [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE],
            });
            repository.findById.mockResolvedValue(session);

            // sequence 0 is STABILITY vs REWARD; GROWTH is not part of that pair
            await expect(service.answerValueBalance(session.id, 0, GROWTH)).rejects.toThrow(
                BusinessException
            );
        });

        it('records a valid answer and returns the next question', async () => {
            const session = createSession({
                valuesInsertionOrder: [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE],
            });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            const progress = await service.answerValueBalance(session.id, 0, STABILITY);

            expect(progress.isComplete).toBe(false);
            expect(progress.next).not.toBeNull();
            expect(session.valuesAnswerLog).toHaveLength(1);
            expect(session.valuesAnswerLog[0]).toEqual({
                sequence: 0,
                left: STABILITY,
                right: REWARD,
                chosen: STABILITY,
            });
        });

        it('discards answers after the edited sequence and continues from there', async () => {
            const insertionOrder = [REWARD, STABILITY, NAME_VALUE, GROWTH, WORK_LIFE_BALANCE];
            const existingLog: ValueComparisonLogEntry[] = [
                { sequence: 0, left: STABILITY, right: REWARD, chosen: STABILITY },
                { sequence: 1, left: NAME_VALUE, right: STABILITY, chosen: NAME_VALUE },
            ];
            const session = createSession({
                valuesInsertionOrder: insertionOrder,
                valuesAnswerLog: existingLog,
            });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            // 0번 질문(STABILITY vs REWARD) 답을 REWARD로 바꿈 -> 1번 이후 로그는 폐기되어야 함
            const progress = await service.answerValueBalance(session.id, 0, REWARD);

            expect(session.valuesAnswerLog).toHaveLength(1);
            expect(session.valuesAnswerLog[0].chosen).toBe(REWARD);
            expect(progress.isComplete).toBe(false);
        });

        it('completes the game, computes weights, and locks the session once the ranking is final', async () => {
            const insertionOrder = [REWARD, STABILITY];
            const session = createSession({ valuesInsertionOrder: insertionOrder });
            repository.findById.mockResolvedValue(session);
            repository.save.mockImplementation((s) => Promise.resolve(s));

            const progress = await service.answerValueBalance(session.id, 0, STABILITY);

            expect(progress.isComplete).toBe(true);
            expect(progress.ranking).toEqual([STABILITY, REWARD]);
            expect(progress.weights).toEqual({ [STABILITY]: 2 / 3, [REWARD]: 1 / 3 });
            expect(session.status).toBe(JobSearchStatus.VALUES_DONE);
            expect(session.valuesCompletedAt).not.toBeNull();
        });
    });

    describe('getStatusForUser', () => {
        it('delegates to the repository lookup by userId', async () => {
            const session = createSession({ status: JobSearchStatus.RESULT_READY });
            repository.findLatestReadyByUserId.mockResolvedValue(session);

            await expect(service.getStatusForUser(7)).resolves.toBe(session);
            expect(repository.findLatestReadyByUserId).toHaveBeenCalledWith(7);
        });

        it('returns null when the user has no completed session', async () => {
            repository.findLatestReadyByUserId.mockResolvedValue(null);

            await expect(service.getStatusForUser(7)).resolves.toBeNull();
        });
    });

    describe('getResultOrThrow', () => {
        it('throws JOB_SEARCH_NOT_FOUND when the token does not exist', async () => {
            repository.findById.mockResolvedValue(null);

            await expect(service.getResultOrThrow('missing')).rejects.toThrow(BusinessException);
        });

        it('throws JOB_SEARCH_RESULT_NOT_READY when the result has not been computed yet', async () => {
            const session = createSession({ status: JobSearchStatus.VALUES_DONE, result: null });
            repository.findById.mockResolvedValue(session);

            await expect(service.getResultOrThrow(session.id)).rejects.toThrow(BusinessException);
        });

        it('throws JOB_SEARCH_RESULT_EXPIRED when past the expiry window', async () => {
            const session = createSession({
                status: JobSearchStatus.RESULT_READY,
                result: { some: 'result' },
                resultExpiresAt: new Date(Date.now() - 1000),
            });
            repository.findById.mockResolvedValue(session);

            await expect(service.getResultOrThrow(session.id)).rejects.toThrow(BusinessException);
        });

        it('returns the session when the result is ready and not expired', async () => {
            const session = createSession({
                status: JobSearchStatus.RESULT_READY,
                result: { some: 'result' },
                resultExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
            });
            repository.findById.mockResolvedValue(session);

            await expect(service.getResultOrThrow(session.id)).resolves.toBe(session);
        });
    });
});
