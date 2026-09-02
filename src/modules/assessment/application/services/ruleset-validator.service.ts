import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RulesetVersionRepository } from '../../infrastructure/repositories/ruleset-version.repository';
import { JobRepository } from '../../infrastructure/repositories/job.repository';
import { HeadlineRepository } from '../../infrastructure/repositories/headline.repository';
import { MAJOR_FIELD_CONFIG } from '../../constants/major-fields.constant';
import { ALL_VALUE_KINDS } from 'src/modules/job-search/domain/enums/value-kind.enum';
import { ALL_TRAIT_KINDS } from '../../domain/enums/trait-kind.enum';

// 부팅 시 코드 상수(전공 매핑)에 적힌 직무 코드가 실제로 DB에 존재하는지 검증한다.
// 오타로 인한 조용한 누락을 막기 위함(3-3). 아직 한 번도 seed하지 않은 빈 DB에서는
// 검사 자체를 건너뛴다 — 최초 개발 환경 부팅까지 막을 이유는 없다.
@Injectable()
export class RulesetValidatorService implements OnModuleInit {
    private readonly logger = new Logger(RulesetValidatorService.name);

    constructor(
        private readonly rulesetVersionRepository: RulesetVersionRepository,
        private readonly jobRepository: JobRepository,
        private readonly headlineRepository: HeadlineRepository
    ) {}

    async onModuleInit(): Promise<void> {
        const latestRuleset = await this.rulesetVersionRepository.findLatest();
        if (!latestRuleset) {
            this.logger.warn(
                'No ruleset_versions row found — skipping boot-time validation (run `pnpm seed` first).'
            );
            return;
        }

        await this.validateMajorFieldJobCodes(latestRuleset.id);
        await this.validateHeadlineCoverage();
    }

    private async validateMajorFieldJobCodes(rulesetVersionId: number): Promise<void> {
        const jobs = await this.jobRepository.findAllActiveByRulesetVersionId(rulesetVersionId);
        const existingCodes = new Set(jobs.map((job) => job.code));

        const missing: string[] = [];
        for (const config of Object.values(MAJOR_FIELD_CONFIG)) {
            for (const code of config.targetJobCodes) {
                if (!existingCodes.has(code)) {
                    missing.push(code);
                }
            }
        }

        if (missing.length > 0) {
            throw new Error(
                `[RulesetValidator] MAJOR_FIELD_CONFIG references job codes missing from jobs table (ruleset ${rulesetVersionId}): ${[...new Set(missing)].join(', ')}`
            );
        }
    }

    // 4-5 [확인필요]: 30개 조합 카피가 전부 준비되어 있는지 seed 단계에서 검증한다(문서 권장안).
    private async validateHeadlineCoverage(): Promise<void> {
        const headlines = await this.headlineRepository.findAll();
        const existing = new Set(headlines.map((h) => `${h.topValue}:${h.topTrait}`));

        const missing: string[] = [];
        for (const value of ALL_VALUE_KINDS) {
            for (const trait of ALL_TRAIT_KINDS) {
                const key = `${value}:${trait}`;
                if (!existing.has(key)) {
                    missing.push(key);
                }
            }
        }

        if (missing.length > 0) {
            throw new Error(
                `[RulesetValidator] headlines table is missing ${missing.length}/30 value×trait combinations: ${missing.join(', ')}`
            );
        }
    }
}
