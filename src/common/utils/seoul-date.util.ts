const SEOUL_TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 현재 시각을 KST(한국 표준시) 기준 wall-clock Date 객체로 반환합니다.
 * timestamp without time zone 컬럼에 저장할 때 DB에 KST 시각이 기록됩니다.
 */
export function getSeoulNow(): Date {
    return new Date(Date.now() + KST_OFFSET_MS);
}

export function getSeoulDateString(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: SEOUL_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
        throw new Error('Failed to format Seoul date');
    }

    return `${year}-${month}-${day}`;
}

export function isSameSeoulDate(left: Date, right: Date): boolean {
    return getSeoulDateString(left) === getSeoulDateString(right);
}

/**
 * 특정 날짜의 서울 시간(KST) 기준 해당 일의 마지막 시각(23:59:59)을 반환합니다.
 * @param date 기준이 되는 날짜 (예: 이벤트 종료일)
 */
export function getEndOfSeoulDay(date: Date): Date {
    const dateString = getSeoulDateString(date);
    return new Date(`${dateString}T23:59:59+09:00`);
}
