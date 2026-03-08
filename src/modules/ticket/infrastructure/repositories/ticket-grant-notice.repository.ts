import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';

@Injectable()
export class TicketGrantNoticeRepository {
    constructor(
        @InjectRepository(TicketGrantNotice)
        private readonly ticketGrantNoticeRepository: Repository<TicketGrantNotice>
    ) {}

    async save(entity: TicketGrantNotice): Promise<TicketGrantNotice> {
        return this.ticketGrantNoticeRepository.save(entity);
    }

    async findById(id: number): Promise<TicketGrantNotice | null> {
        return this.ticketGrantNoticeRepository.findOne({ where: { id } });
    }

    async findNextPendingByUserId(userId: number, now: Date): Promise<TicketGrantNotice | null> {
        return this.ticketGrantNoticeRepository
            .createQueryBuilder('notice')
            .where('notice.userId = :userId', { userId })
            .andWhere('notice.status = :status', { status: TicketGrantNoticeStatus.PENDING })
            .andWhere('(notice.expiresAt IS NULL OR notice.expiresAt > :now)', { now })
            .orderBy('notice.created_at', 'DESC')
            .getOne();
    }

    async findByIdAndUserIdForUpdate(
        id: number,
        userId: number
    ): Promise<TicketGrantNotice | null> {
        return this.ticketGrantNoticeRepository
            .createQueryBuilder('notice')
            .where('notice.id = :id', { id })
            .andWhere('notice.userId = :userId', { userId })
            .setLock('pessimistic_write')
            .getOne();
    }
}
