import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobSearchSession } from '../../domain/job-search-session.entity';
import { JobSearchStatus } from '../../domain/enums/job-search-status.enum';

@Injectable()
export class JobSearchSessionRepository {
    constructor(
        @InjectRepository(JobSearchSession)
        private readonly repo: Repository<JobSearchSession>
    ) {}

    save(session: JobSearchSession): Promise<JobSearchSession> {
        return this.repo.save(session);
    }

    findById(id: string): Promise<JobSearchSession | null> {
        return this.repo.findOne({ where: { id } });
    }

    findLatestReadyByUserId(userId: number): Promise<JobSearchSession | null> {
        return this.repo.findOne({
            where: { userId, status: JobSearchStatus.RESULT_READY },
            order: { createdAt: 'DESC' },
        });
    }
}
