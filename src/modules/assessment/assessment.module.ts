import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RulesetVersion } from './domain/ruleset-version.entity';
import { Job } from './domain/job.entity';
import { CompanyType } from './domain/company-type.entity';
import { Headline } from './domain/headline.entity';
import { AssessmentResult } from './domain/assessment-result.entity';
import { ValueBalanceSession } from './domain/value-balance-session.entity';
import { RulesetVersionRepository } from './infrastructure/repositories/ruleset-version.repository';
import { JobRepository } from './infrastructure/repositories/job.repository';
import { CompanyTypeRepository } from './infrastructure/repositories/company-type.repository';
import { HeadlineRepository } from './infrastructure/repositories/headline.repository';
import { AssessmentResultRepository } from './infrastructure/repositories/assessment-result.repository';
import { ValueBalanceSessionRepository } from './infrastructure/repositories/value-balance-session.repository';
import { RulesetValidatorService } from './application/services/ruleset-validator.service';
import { AssessmentService } from './application/services/assessment.service';
import { ValueBalanceSessionService } from './application/services/value-balance-session.service';
import { OptionalAuthGuard } from './infrastructure/guards/optional-auth.guard';
import { AssessmentController } from './presentation/assessment.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            RulesetVersion,
            Job,
            CompanyType,
            Headline,
            AssessmentResult,
            ValueBalanceSession,
        ]),
        AuthModule,
    ],
    controllers: [AssessmentController],
    providers: [
        RulesetVersionRepository,
        JobRepository,
        CompanyTypeRepository,
        HeadlineRepository,
        AssessmentResultRepository,
        ValueBalanceSessionRepository,
        RulesetValidatorService,
        AssessmentService,
        ValueBalanceSessionService,
        OptionalAuthGuard,
    ],
})
export class AssessmentModule {}
