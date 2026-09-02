import { TraitKind } from '../domain/enums/trait-kind.enum';

// [확인필요 - 문서에 없음] 1~12번 문항이 정확히 어느 특성에 매핑되는지 원본 문서에 없다.
// 특성당 2문항이라는 것만 명시되어 있고 실제 문항 번호 매핑표가 빠져있어, 임의로 순서대로
// 배정한 잠정값이다. 실제 검사지 문항 번호가 확정되면 이 배열만 교체하면 된다.
export const TRAIT_QUESTION_MAP: Readonly<Record<number, TraitKind>> = {
    1: TraitKind.INVESTIGATIVE,
    2: TraitKind.INVESTIGATIVE,
    3: TraitKind.SOCIAL,
    4: TraitKind.SOCIAL,
    5: TraitKind.ENTERPRISING,
    6: TraitKind.ENTERPRISING,
    7: TraitKind.CONVENTIONAL,
    8: TraitKind.CONVENTIONAL,
    9: TraitKind.REALISTIC,
    10: TraitKind.REALISTIC,
    11: TraitKind.ARTISTIC,
    12: TraitKind.ARTISTIC,
};

export interface TradeoffPair {
    questionNo: number;
    left: TraitKind;
    right: TraitKind;
}

// 13~15번: 두 특성의 트레이드오프 문항.
export const TRADEOFF_PAIRS: readonly TradeoffPair[] = [
    { questionNo: 13, left: TraitKind.ENTERPRISING, right: TraitKind.INVESTIGATIVE },
    { questionNo: 14, left: TraitKind.REALISTIC, right: TraitKind.SOCIAL },
    { questionNo: 15, left: TraitKind.ARTISTIC, right: TraitKind.CONVENTIONAL },
];

// 6단계 응답(1~6) -> [좌측 배점, 우측 배점]. 응답값 1이 "그렇다", 6이 "그렇지 않다"를 뜻한다.
export const TRADEOFF_SCORE_TABLE: Readonly<Record<number, readonly [number, number]>> = {
    1: [5.5, 0.5], // 그렇다
    2: [4.5, 1.5], // 그렇다 -1
    3: [3.5, 2.5], // 그렇다 -2
    4: [2.5, 3.5], // 그렇지 않다 -2
    5: [1.5, 4.5], // 그렇지 않다 -1
    6: [0.5, 5.5], // 그렇지 않다
};

export const TRAIT_ANSWER_COUNT = 15;
