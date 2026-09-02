import { MajorField, MajorFieldType } from '../../domain/enums/major-field.enum';
import { resolveJobPool } from './job-pool.resolver';
import { MAJOR_FIELD_CONFIG } from '../../constants/major-fields.constant';

describe('resolveJobPool', () => {
    it('전공 무관(null) -> 전체 풀, 가산 없음', () => {
        const result = resolveJobPool(null);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('NEUTRAL 계열(인문·사회) -> 전체 풀, 가산 없음', () => {
        const result = resolveJobPool(MajorField.HUMANITIES_SOCIAL);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('BONUS 계열(경영) -> 전체 풀 + 대상 직무에만 가산', () => {
        const result = resolveJobPool(MajorField.BUSINESS);
        expect(result.isRestricted).toBe(false);
        expect(result.bonusJobCodes.size).toBe(4);
        expect(result.bonusJobCodes.has('HRM')).toBe(true);
        expect(result.bonusJobCodes.has('FRONTEND_DEV')).toBe(false); // 비대상 직무엔 가산 안 샘
    });

    it('RESTRICTED 계열(컴퓨터공학) -> 대상 직무 8개만', () => {
        const result = resolveJobPool(MajorField.COMPUTER_SCIENCE);
        expect(result.isRestricted).toBe(true);
        expect(result.restrictedJobCodes).toHaveLength(8);
        expect(result.restrictedJobCodes).toContain('BACKEND_DEV');
        expect(result.restrictedJobCodes).not.toContain('HRM');
        expect(result.bonusJobCodes.size).toBe(0);
    });

    it('모든 MajorField에 대해 설정이 일관적이다(NEUTRAL은 대상 없음)', () => {
        for (const config of Object.values(MAJOR_FIELD_CONFIG)) {
            if (config.type === MajorFieldType.NEUTRAL) {
                expect(config.targetJobCodes).toHaveLength(0);
            } else {
                expect(config.targetJobCodes.length).toBeGreaterThan(0);
            }
        }
    });
});
