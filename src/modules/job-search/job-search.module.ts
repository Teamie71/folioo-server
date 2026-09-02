import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobSearchSession } from './domain/job-search-session.entity';
import { JobSearchSessionRepository } from './infrastructure/repositories/job-search-session.repository';
import { JobSearchSessionService } from './application/services/job-search-session.service';
import { JobSearchController } from './presentation/job-search.controller';

@Module({
    imports: [TypeOrmModule.forFeature([JobSearchSession])],
    controllers: [JobSearchController],
    providers: [JobSearchSessionRepository, JobSearchSessionService],
    exports: [JobSearchSessionService],
})
export class JobSearchModule {}
