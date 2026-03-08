/* eslint-disable */
// API helper and shared constants

export const TICKET_TYPE_LABELS = {
    EXPERIENCE: '경험 정리',
    PORTFOLIO_CORRECTION: '포트폴리오 첨삭',
};

export const NOTICE_STATUS_LABELS = {
    PENDING: '대기',
    SHOWN: '노출됨',
    DISMISSED: '닫힘',
};

export const GRANT_SOURCE_LABELS = {
    EVENT: '이벤트',
    SIGNUP: '가입 보상',
    ADMIN: '운영 지급',
    COMPENSATION: '보상',
    PURCHASE: '구매',
};

export const GRANT_REASONS = [
    '피드백 제출',
    '인사이트 로그 작성 챌린지',
    '서비스 이용 불편에 대한 보상',
];

export const TABS = [
    { id: 'users', label: '회원 관리', enabled: true },
    { id: 'tickets', label: '이용권 거래 내역', enabled: true },
    { id: 'grants', label: '지급/안내 이력', enabled: true },
];

export async function api(url, options) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.isSuccess) {
        throw new Error(data.error?.reason ?? data.error?.message ?? '요청에 실패했습니다');
    }
    return data.result;
}
