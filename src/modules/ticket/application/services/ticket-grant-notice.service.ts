import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';
import { TicketGrantNoticeRepository } from '../../infrastructure/repositories/ticket-grant-notice.repository';

@Injectable()
export class TicketGrantNoticeService {
    constructor(private readonly ticketGrantNoticeRepository: TicketGrantNoticeRepository) {}

    async save(notice: TicketGrantNotice): Promise<TicketGrantNotice> {
        return this.ticketGrantNoticeRepository.save(notice);
    }

    async findNextPendingByUserId(userId: number): Promise<TicketGrantNotice | null> {
        return this.ticketGrantNoticeRepository.findNextPendingByUserId(userId, new Date());
    }

    async markShown(userId: number, noticeId: number): Promise<TicketGrantNotice> {
        const notice = await this.ticketGrantNoticeRepository.findByIdAndUserIdForUpdate(
            noticeId,
            userId
        );
        if (!notice) {
            throw new BusinessException(ErrorCode.TICKET_GRANT_NOTICE_NOT_FOUND);
        }

        if (notice.status === TicketGrantNoticeStatus.PENDING) {
            notice.status = TicketGrantNoticeStatus.SHOWN;
        }
        notice.shownAt = notice.shownAt ?? new Date();
        return this.ticketGrantNoticeRepository.save(notice);
    }

    async markDismissed(userId: number, noticeId: number): Promise<TicketGrantNotice> {
        const notice = await this.ticketGrantNoticeRepository.findByIdAndUserIdForUpdate(
            noticeId,
            userId
        );
        if (!notice) {
            throw new BusinessException(ErrorCode.TICKET_GRANT_NOTICE_NOT_FOUND);
        }

        notice.status = TicketGrantNoticeStatus.DISMISSED;
        notice.shownAt = notice.shownAt ?? new Date();
        notice.dismissedAt = notice.dismissedAt ?? new Date();
        return this.ticketGrantNoticeRepository.save(notice);
    }
}
