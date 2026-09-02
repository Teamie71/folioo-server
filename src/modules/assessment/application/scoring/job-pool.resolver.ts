import { MajorField, MajorFieldType } from '../../domain/enums/major-field.enum';
import { MAJOR_FIELD_CONFIG } from '../../constants/major-fields.constant';

export interface JobPoolResolution {
    // true면 restrictedJobCodes에 속한 직무만 계산 대상. false면 전체 풀 대상(가산점만 다름).
    isRestricted: boolean;
    restrictedJobCodes: readonly string[];
    bonusJobCodes: ReadonlySet<string>;
}

// 순수 함수: 3-4 표 그대로. majorField가 null(전공 무관)이면 전체 풀, 가산 없음.
export function resolveJobPool(majorField: MajorField | null): JobPoolResolution {
    if (majorField === null) {
        return { isRestricted: false, restrictedJobCodes: [], bonusJobCodes: new Set() };
    }

    const config = MAJOR_FIELD_CONFIG[majorField];

    if (config.type === MajorFieldType.RESTRICTED) {
        return {
            isRestricted: true,
            restrictedJobCodes: config.targetJobCodes,
            bonusJobCodes: new Set(),
        };
    }

    if (config.type === MajorFieldType.BONUS) {
        return {
            isRestricted: false,
            restrictedJobCodes: [],
            bonusJobCodes: new Set(config.targetJobCodes),
        };
    }

    // NEUTRAL
    return { isRestricted: false, restrictedJobCodes: [], bonusJobCodes: new Set() };
}
