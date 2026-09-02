import { JobSearchSessionService } from './job-search-session.service';
import { JobSearchSessionRepository } from '../../infrastructure/repositories/job-search-session.repository';
import { JobSearchSession } from '../../domain/job-search-session.entity';
import { JobSearchStatus } from '../../domain/enums/job-search-status.enum';
import { ValueKind } from '../../domain/enums/value-kind.enum';

class JobSearchSessionRepositoryStub {
    readonly findLatestReadyByUserId = jest.fn<Promise<JobSearchSession | null>, [number]>();
}

const createSession = (overrides: Partial<JobSearchSession> = {}): JobSearchSession => {
    const session = JobSearchSession.create(overrides.userId ?? null, [
        ValueKind.REWARD,
        ValueKind.STABILITY,
    ]);
    session.id = overrides.id ?? 'session-1';
    session.status = overrides.status ?? session.status;
    return session;
};

describe('JobSearchSessionService', () => {
    let service: JobSearchSessionService;
    let repository: JobSearchSessionRepositoryStub;

    beforeEach(() => {
        repository = new JobSearchSessionRepositoryStub();
        service = new JobSearchSessionService(repository as unknown as JobSearchSessionRepository);
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
});
