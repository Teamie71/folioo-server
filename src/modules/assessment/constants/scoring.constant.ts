// 실제 문항지 기준 6단계 확정(1~15번 전부). "그렇다"=SCALE_MAX(그 특성이 강함),
// "그렇지 않다"=SCALE_MIN 방향으로 응답값을 그대로 합산한다(1~12번), 13~15번은
// TRADEOFF_SCORE_TABLE이 이 방향을 그대로 반영해 미리 변환해둔 값이다.
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
