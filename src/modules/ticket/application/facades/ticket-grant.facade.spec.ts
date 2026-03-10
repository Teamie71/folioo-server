import { TicketGrantFacade } from './ticket-grant.facade';
import { TicketType } from '../../domain/enums/ticket-type.enum';

describe('TicketGrantFacade', () => {
    let ticketGrantFacade: TicketGrantFacade;

    beforeEach(() => {
        ticketGrantFacade = new TicketGrantFacade(
            { save: jest.fn(), getAdminGrantList: jest.fn() } as never,
            {
                save: jest.fn(),
                findNextPendingByUserId: jest.fn(),
                markShown: jest.fn(),
                markDismissed: jest.fn(),
            } as never,
            { issueTickets: jest.fn() } as never
        );
    });

    it('formats multiple rewards into a user-facing summary', () => {
        const result = ticketGrantFacade.formatRewardSummary([
            { type: TicketType.EXPERIENCE, quantity: 1 },
            { type: TicketType.PORTFOLIO_CORRECTION, quantity: 2 },
        ]);

        expect(result).toBe('경험 정리 1회권 + 포트폴리오 첨삭 2회권');
    });

    it('creates default notice payload with display reason and reward list', () => {
        const expiresAt = new Date('2026-03-24T00:00:00.000Z');

        const result = ticketGrantFacade.createDefaultNotice({
            title: '보상이 지급되었어요',
            rewardSummary: '경험 정리 1회권',
            displayReason: '서비스 이용 불편에 대한 보상',
            ctaText: '보러가기',
            ctaLink: '/tickets',
            rewards: [{ type: TicketType.EXPERIENCE, quantity: 1 }],
            expiresAt,
        });

        expect(result).toEqual({
            title: '보상이 지급되었어요',
            body: '경험 정리 1회권',
            ctaText: '보러가기',
            ctaLink: '/tickets',
            expiresAt,
            payload: {
                displayReason: '서비스 이용 불편에 대한',
                rewards: [{ type: TicketType.EXPERIENCE, quantity: 1 }],
            },
        });
    });

    it('normalizes the special CS display reason label', () => {
        expect(ticketGrantFacade.normalizeDisplayReason('서비스 이용 불편에 대한 보상')).toBe(
            '서비스 이용 불편에 대한'
        );
        expect(ticketGrantFacade.normalizeDisplayReason('피드백 제출')).toBe('피드백 제출');
    });
});
