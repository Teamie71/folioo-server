import { Injectable } from '@nestjs/common';
import { JobSearchSessionRepository } from '../../infrastructure/repositories/job-search-session.repository';
import { JobSearchSession } from '../../domain/job-search-session.entity';

@Injectable()
export class JobSearchSessionService {
    constructor(private readonly jobSearchSessionRepository: JobSearchSessionRepository) {}

    async getStatusForUser(userId: number): Promise<JobSearchSession | null> {
        return this.jobSearchSessionRepository.findLatestReadyByUserId(userId);
    }
}
