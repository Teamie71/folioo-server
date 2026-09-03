import { TraitVector, ScoredJob } from '../../domain/types';
import { ALL_TRAIT_KINDS } from '../../domain/enums/trait-kind.enum';
import { TRAIT_MATCH_COEFFICIENT, MAJOR_BONUS_SCORE } from '../../constants/scoring.constant';
import { sortByScoreDesc } from './score-sort.util';

export interface JobScoringInput {
    code: string;
    name: string;
    traits: TraitVector;
    summary: string;
    coreSkills: string[];
    recommendedActivities: string[];
}

// 순수 함수: 최종점수 = cosineSimilarity(성향) × 0.8 + 전공가산(0.2 or 0).
export function scoreJobs(
    jobs: readonly JobScoringInput[],
    userTraitVector: TraitVector,
    bonusJobCodes: ReadonlySet<string>,
    topN: number
): ScoredJob[] {
    const scored = jobs.map((job) => {
        const matchRatio = cosineSimilarity(userTraitVector, job.traits);
        const bonus = bonusJobCodes.has(job.code) ? MAJOR_BONUS_SCORE : 0;
        const finalScore = matchRatio * TRAIT_MATCH_COEFFICIENT + bonus;
        return { job, finalScore };
    });

    const sorted = sortByScoreDesc(
        scored,
        (s) => s.finalScore,
        (s) => s.job.code
    );

    return sorted.slice(0, topN).map(({ job, finalScore }) => ({
        code: job.code,
        name: job.name,
        matchRate: Math.round(finalScore * 100),
        summary: job.summary,
        coreSkills: job.coreSkills,
        recommendedActivities: job.recommendedActivities,
    }));
}

// 영벡터 입력 시 0으로 나누기가 발생하지 않도록 방어한다(8절 필수 테스트 케이스).
function cosineSimilarity(a: TraitVector, b: TraitVector): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const trait of ALL_TRAIT_KINDS) {
        dot += a[trait] * b[trait];
        normA += a[trait] ** 2;
        normB += b[trait] ** 2;
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
