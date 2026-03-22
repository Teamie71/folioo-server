import { TicketGrantNoticeResDTO } from './ticket-grant-notice.dto';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';

describe('TicketGrantNoticeResDTO', () => {
    const createBaseNotice = (): TicketGrantNotice => {
        const notice = new TicketGrantNotice();
        notice.id = 1;
        notice.ticketGrantId = 11;
        notice.userId = 7;
        notice.status = TicketGrantNoticeStatus.PENDING;
        notice.title = '보상이 지급되었어요';
        notice.body = '경험 정리 1회권';
        notice.ctaText = null;
        notice.ctaLink = null;
        notice.shownAt = null;
        notice.dismissedAt = null;
        notice.expiresAt = null;
        notice.createdAt = new Date('2026-03-08T00:00:00.000Z');
        notice.updatedAt = new Date('2026-03-08T00:00:00.000Z');
        return notice;
    };

    it('uses default displayPeriod when payload omits it', () => {
        const notice = createBaseNotice();
        notice.payload = {
            displayReason: '서비스 이용 불편에 대한 보상',
            rewards: [{ type: TicketType.EXPERIENCE, quantity: 1 }],
        };

        const dto = TicketGrantNoticeResDTO.from(notice);

        expect(dto.payload?.displayPeriod).toBe('6개월 간');
    });

    it('keeps displayPeriod when payload provides it', () => {
        const notice = createBaseNotice();
        notice.payload = {
            displayReason: '서비스 이용 불편에 대한 보상',
            displayPeriod: '3개월 간',
            rewards: [{ type: TicketType.EXPERIENCE, quantity: 1 }],
        };

        const dto = TicketGrantNoticeResDTO.from(notice);

        expect(dto.payload?.displayPeriod).toBe('3개월 간');
    });

    it('uses weekly fallback when title is 이번 주의 무료 이용권', () => {
        const notice = createBaseNotice();
        notice.title = '이번 주의 무료 이용권';
        notice.payload = {
            displayReason: '주간 보상',
            rewards: [{ type: TicketType.EXPERIENCE, quantity: 1 }],
        };

        const dto = TicketGrantNoticeResDTO.from(notice);

        expect(dto.payload?.displayPeriod).toBe('일요일까지');
    });
});
