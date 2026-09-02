import { MajorField, MajorFieldType } from '../domain/enums/major-field.enum';

export interface MajorFieldConfig {
    type: MajorFieldType;
    // BONUS: 이 직무들에만 가산점. RESTRICTED: 이 직무들만 대상 풀이 됨.
    targetJobCodes: readonly string[];
}

// 문서 3-3 표 그대로. 직무 코드는 DB(jobs.code)를 참조하며, 부팅 시
// ruleset.validator가 이 코드들이 실제로 DB에 존재하는지 검증한다.
export const MAJOR_FIELD_CONFIG: Readonly<Record<MajorField, MajorFieldConfig>> = {
    [MajorField.HUMANITIES_SOCIAL]: { type: MajorFieldType.NEUTRAL, targetJobCodes: [] },
    [MajorField.NATURAL_SCIENCE]: { type: MajorFieldType.NEUTRAL, targetJobCodes: [] },
    [MajorField.LANGUAGE]: {
        type: MajorFieldType.BONUS,
        targetJobCodes: ['OVERSEAS_SALES', 'TRADE'],
    },
    [MajorField.BUSINESS]: {
        type: MajorFieldType.BONUS,
        targetJobCodes: ['HRM', 'FINANCE_ACCOUNTING', 'PROCUREMENT_SCM', 'PUBLIC_ADMIN'],
    },
    [MajorField.ECONOMICS]: {
        type: MajorFieldType.BONUS,
        targetJobCodes: ['ASSET_MANAGEMENT', 'SECURITIES_RESEARCH', 'PUBLIC_ADMIN'],
    },
    [MajorField.MEDIA_COMMUNICATION]: {
        type: MajorFieldType.BONUS,
        targetJobCodes: [
            'VIDEO_PRODUCTION',
            'EDITOR_COPYWRITER',
            'CONTENT_IP_CHANNEL',
            'CONTENT_PLANNING',
            'PR',
            'AD_AE',
        ],
    },
    [MajorField.MATH_STATISTICS]: {
        type: MajorFieldType.BONUS,
        targetJobCodes: ['SECURITIES_RESEARCH', 'DATA_ANALYSIS', 'AI_ML_ENGINEER'],
    },
    [MajorField.COMPUTER_SCIENCE]: {
        type: MajorFieldType.RESTRICTED,
        targetJobCodes: [
            'FRONTEND_DEV',
            'BACKEND_DEV',
            'AI_ML_ENGINEER',
            'QA_ENGINEER',
            'GAME_DEV',
            'DEVOPS_ENGINEER',
            'SECURITY_INFRA',
            'DATA_ANALYSIS',
        ],
    },
    [MajorField.ENGINEERING]: {
        type: MajorFieldType.RESTRICTED,
        targetJobCodes: [
            'PRODUCTION_TECH',
            'QUALITY_ASSURANCE',
            'RND',
            'PROCUREMENT_SCM',
            'B2B_TECH_SALES',
        ],
    },
    [MajorField.ART_DESIGN]: {
        type: MajorFieldType.RESTRICTED,
        targetJobCodes: [
            'UX_UI_DESIGN',
            'BX_GRAPHIC_DESIGN',
            'MOTION_DESIGN',
            'PRODUCT_DESIGN',
            'VIDEO_PRODUCTION',
            'CONTENT_MARKETING',
        ],
    },
};
