const SEOUL_TIME_ZONE = 'Asia/Seoul';

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
