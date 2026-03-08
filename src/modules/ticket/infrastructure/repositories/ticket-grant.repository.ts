import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketGrant } from '../../domain/entities/ticket-grant.entity';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';

export interface AdminTicketGrantProjection {
    grantId: number;
    userId: number;
    userName: string;
    userEmail: string | null;
    sourceType: string;
    actorType: string;
    actorId: string | null;
    reasonCode: string | null;
    reasonText: string | null;
    rewardSnapshot: unknown;
    grantedAt: Date | string;
    noticeId: number | null;
    noticeStatus: TicketGrantNoticeStatus | null;
    noticeShownAt: Date | string | null;
    noticeDismissedAt: Date | string | null;
}

@Injectable()
export class TicketGrantRepository {
    constructor(
        @InjectRepository(TicketGrant)
        private readonly ticketGrantRepository: Repository<TicketGrant>
    ) {}

    async save(entity: TicketGrant): Promise<TicketGrant> {
        return this.ticketGrantRepository.save(entity);
    }

    async findById(id: number): Promise<TicketGrant | null> {
        return this.ticketGrantRepository.findOne({ where: { id } });
    }

    async findAllWithLatestNotice({
        limit = 100,
        offset = 0,
    }: { limit?: number; offset?: number } = {}): Promise<AdminTicketGrantProjection[]> {
        const latestNoticeSubquery = this.ticketGrantRepository
            .createQueryBuilder('grant_for_notice')
            .subQuery()
            .select('MAX(notice_sub.id)')
            .from('ticket_grant_notice', 'notice_sub')
            .where('notice_sub.ticket_grant_id = g.id')
            .getQuery();

        return this.ticketGrantRepository
            .createQueryBuilder('g')
            .innerJoin('users', 'u', 'u.id = g.user_id')
            .leftJoin('social_user', 'su', 'su.user_id = u.id')
            .leftJoin(
                'ticket_grant_notice',
                'n',
                `n.ticket_grant_id = g.id AND n.id = ${latestNoticeSubquery}`
            )
            .select([
                'g.id AS "grantId"',
                'u.id AS "userId"',
                'u.name AS "userName"',
                'MIN(su.email) AS "userEmail"',
                'g.source_type AS "sourceType"',
                'g.actor_type AS "actorType"',
                'g.actor_id AS "actorId"',
                'g.reason_code AS "reasonCode"',
                'g.reason_text AS "reasonText"',
                'g.reward_snapshot AS "rewardSnapshot"',
                'g.granted_at AS "grantedAt"',
                'n.id AS "noticeId"',
                'n.status AS "noticeStatus"',
                'n.shown_at AS "noticeShownAt"',
                'n.dismissed_at AS "noticeDismissedAt"',
            ])
            .groupBy('g.id')
            .addGroupBy('u.id')
            .addGroupBy('n.id')
            .orderBy('g.granted_at', 'DESC')
            .offset(offset)
            .limit(limit)
            .getRawMany<AdminTicketGrantProjection>();
    }
}
