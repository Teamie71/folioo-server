import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';

export const WEEKLY_EVENT_TICKET_CRON = '0 0 * * 1';
export const KST_TIME_ZONE = 'Asia/Seoul';

export const WEEKLY_EVENT_BATCH_SIZE = 200;

export const WEEKLY_EVENT_REWARDS = [
    { type: TicketType.EXPERIENCE, quantity: 3 },
    { type: TicketType.PORTFOLIO_CORRECTION, quantity: 5 },
];

export const WEEKLY_EVENT_ACTOR_ID = 'weekly-event-ticket-scheduler';
export const WEEKLY_EVENT_REASON_CODE = 'weekly_event_free_ticket';
export const WEEKLY_EVENT_REASON_TEXT = '주간 무료 이용권 자동 지급';

export const WEEKLY_EVENT_NOTICE_TITLE = '이번 주의 무료 이용권';
export const WEEKLY_EVENT_NOTICE_BODY = '경험 정리 3회권 + 포트폴리오 첨삭 5회권';
export const WEEKLY_EVENT_NOTICE_CTA_TEXT = '첨삭 의뢰하기';
export const WEEKLY_EVENT_NOTICE_CTA_LINK = '/correction/new';
export const WEEKLY_EVENT_NOTICE_DISPLAY_PERIOD = '일요일까지';
