// [확인필요] 성향 문항 척도가 5단계인지 6단계인지 원본 기획서 내에서 상충한다.
// 13~15번 대립쌍 배점표가 명백히 6단계라 6단계로 가정하고, 확정되면 이 두 상수만 바꾸면 된다.
export const SCALE_MIN = 1;
export const SCALE_MAX = 6;

// [확인필요] 가치관 가중치가 선형(1위=5점..5위=1점/15)인지 ROC인지 문서 내에서 상충한다.
// "반올림 전 값을 사용" 명시 + 실제 계산식이 있는 절이 ROC를 담고 있어 ROC를 최신으로 가정한다.
// 확정되면 이 배열만 교체하면 된다(순위 1위부터 5위 순서).
export const ROC_WEIGHTS: readonly number[] = [137 / 300, 77 / 300, 47 / 300, 27 / 300, 12 / 300];

// 최종점수 = 성향매칭(코사인 유사도) × TRAIT_MATCH_COEFFICIENT + 전공가산
export const TRAIT_MATCH_COEFFICIENT = 0.8;
export const MAJOR_BONUS_SCORE = 0.2;

export const TOP_JOBS_COUNT = 3;
export const TOP_COMPANY_TYPES_COUNT = 1;
