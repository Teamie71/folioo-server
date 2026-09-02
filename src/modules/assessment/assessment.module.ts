import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesetVersion } from './domain/ruleset-version.entity';
import { Job } from './domain/job.entity';
import { CompanyType } from './domain/company-type.entity';
import { Headline } from './domain/headline.entity';
import { AssessmentResult } from './domain/assessment-result.entity';
import { RulesetVersionRepository } from './infrastructure/repositories/ruleset-version.repository';
import { JobRepository } from './infrastructure/repositories/job.repository';
import { CompanyTypeRepository } from './infrastructure/repositories/company-type.repository';
import { HeadlineRepository } from './infrastructure/repositories/headline.repository';
import { AssessmentResultRepository } from './infrastructure/repositories/assessment-result.repository';
import { RulesetValidatorService } from './application/services/ruleset-validator.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([RulesetVersion, Job, CompanyType, Headline, AssessmentResult]),
    ],
    providers: [
        RulesetVersionRepository,
        JobRepository,
        CompanyTypeRepository,
        HeadlineRepository,
        AssessmentResultRepository,
        RulesetValidatorService,
    ],
})
export class AssessmentModule {}
