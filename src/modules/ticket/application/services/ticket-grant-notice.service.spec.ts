import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';
import { TicketGrantNoticeService } from './ticket-grant-notice.service';

class TicketGrantNoticeRepositoryStub {
    readonly save = jest.fn<Promise<TicketGrantNotice>, [TicketGrantNotice]>();
    readonly findNextPendingByUserId = jest.fn<Promise<TicketGrantNotice | null>, [number, Date]>();
    readonly findByIdAndUserIdForUpdate = jest.fn<
        Promise<TicketGrantNotice | null>,
        [number, number]
    >();
}

describe('TicketGrantNoticeService', () => {
    let ticketGrantNoticeService: TicketGrantNoticeService;
    let ticketGrantNoticeRepositoryStub: TicketGrantNoticeRepositoryStub;

    beforeEach(() => {
        ticketGrantNoticeRepositoryStub = new TicketGrantNoticeRepositoryStub();
        ticketGrantNoticeRepositoryStub.save.mockImplementation((notice) =>
            Promise.resolve(notice)
        );
        ticketGrantNoticeService = new TicketGrantNoticeService(
            ticketGrantNoticeRepositoryStub as never
        );
    });

    it('marks a pending notice as shown and sets shownAt once', async () => {
        const notice = new TicketGrantNotice();
        notice.id = 11;
        notice.userId = 7;
        notice.status = TicketGrantNoticeStatus.PENDING;
        notice.shownAt = null;
        notice.dismissedAt = null;

        ticketGrantNoticeRepositoryStub.findByIdAndUserIdForUpdate.mockResolvedValue(notice);

        const result = await ticketGrantNoticeService.markShown(7, 11);

        expect(result.status).toBe(TicketGrantNoticeStatus.SHOWN);
        expect(result.shownAt).toBeInstanceOf(Date);
        expect(ticketGrantNoticeRepositoryStub.save).toHaveBeenCalledWith(notice);
    });

    it('marks a notice as dismissed and preserves existing shownAt', async () => {
        const shownAt = new Date('2026-03-08T00:00:00.000Z');
        const notice = new TicketGrantNotice();
        notice.id = 22;
        notice.userId = 8;
        notice.status = TicketGrantNoticeStatus.SHOWN;
        notice.shownAt = shownAt;
        notice.dismissedAt = null;

        ticketGrantNoticeRepositoryStub.findByIdAndUserIdForUpdate.mockResolvedValue(notice);

        const result = await ticketGrantNoticeService.markDismissed(8, 22);

        expect(result.status).toBe(TicketGrantNoticeStatus.DISMISSED);
        expect(result.shownAt).toBe(shownAt);
        expect(result.dismissedAt).toBeInstanceOf(Date);
    });

    it('throws when the notice does not exist', async () => {
        ticketGrantNoticeRepositoryStub.findByIdAndUserIdForUpdate.mockResolvedValue(null);

        await expect(ticketGrantNoticeService.markShown(3, 999)).rejects.toEqual(
            new BusinessException(ErrorCode.TICKET_GRANT_NOTICE_NOT_FOUND)
        );
    });
});
