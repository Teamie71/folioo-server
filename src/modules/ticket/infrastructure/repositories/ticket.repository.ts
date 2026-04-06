import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../../domain/entities/ticket.entity';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';

interface TicketCountByType {
    type: TicketType;
    count: number;
}

interface TicketCountByUserAndType {
    userId: number;
    type: TicketType;
    count: number;
}

interface ExpiringTicketInfo {
    type: TicketType;
    count: number;
    earliestExpiredAt: string | Date | null;
}

export interface TicketWithUserProjection {
    ticketId: number;
    userId: number;
    userName: string;
    userEmail: string | null;
    type: TicketType;
    status: string;
    source: string;
    createdAt: Date;
    usedAt: Date | null;
    expiredAt: Date | null;
}

@Injectable()
export class TicketRepository {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>
    ) {}

    async save(entity: Ticket): Promise<Ticket> {
        return this.ticketRepository.save(entity);
    }

    async saveAll(entities: Ticket[]): Promise<Ticket[]> {
        return this.ticketRepository.save(entities);
    }

    async findById(id: number): Promise<Ticket | null> {
        return this.ticketRepository.findOne({ where: { id } });
    }

    async findOneAvailableForConsume(
        userId: number,
        type: TicketType,
        now: Date
    ): Promise<Ticket | null> {
        const qb = this.ticketRepository
            .createQueryBuilder('ticket')
            .where('ticket.userId = :userId', { userId })
            .andWhere('ticket.type = :type', { type })
            .andWhere('ticket.status = :status', { status: TicketStatus.AVAILABLE })
            .andWhere('(ticket.expiredAt IS NULL OR ticket.expiredAt > :now)', { now })
            .orderBy('ticket.expiredAt', 'ASC', 'NULLS LAST')
            .addOrderBy('ticket.id', 'ASC')
            .setLock('pessimistic_write');

        if (typeof qb.setOnLocked === 'function') {
            qb.setOnLocked('skip_locked');
        }

        return qb.getOne();
    }

    async existsById(id: number): Promise<boolean> {
        return this.ticketRepository.exists({ where: { id } });
    }

    async countUsedByPaymentId(paymentId: number): Promise<number> {
        return this.ticketRepository.count({
            where: {
                paymentId,
                status: TicketStatus.USED,
            },
        });
    }

    async expireAvailableByPaymentId(paymentId: number, expiredAt: Date): Promise<void> {
        await this.ticketRepository.update(
            {
                paymentId,
                status: TicketStatus.AVAILABLE,
            },
            {
                status: TicketStatus.EXPIRED,
                expiredAt,
                updatedAt: new Date(),
            }
        );
    }

    async expireOutdatedAvailableTickets(now: Date): Promise<number> {
        const result = await this.ticketRepository
            .createQueryBuilder()
            .update(Ticket)
            .set({
                status: TicketStatus.EXPIRED,
                updatedAt: new Date(),
            })
            .where('status = :status', { status: TicketStatus.AVAILABLE })
            .andWhere('expired_at IS NOT NULL')
            .andWhere('expired_at < :now', { now })
            .execute();

        return result.affected ?? 0;
    }

    async countAvailableByUserIdGroupByType(userId: number): Promise<TicketCountByType[]> {
        const rows = await this.ticketRepository
            .createQueryBuilder('ticket')
            .select('ticket.type', 'type')
            .addSelect('COUNT(*)::int', 'count')
            .where('ticket.userId = :userId', { userId })
            .andWhere('ticket.status = :status', { status: TicketStatus.AVAILABLE })
            .groupBy('ticket.type')
            .getRawMany<TicketCountByType>();

        return rows;
    }

    async findExpiringByUserIdGroupByType(
        userId: number,
        now: Date,
        expiredBefore: Date
    ): Promise<ExpiringTicketInfo[]> {
        const rows = await this.ticketRepository
            .createQueryBuilder('ticket')
            .select('ticket.type', 'type')
            .addSelect('COUNT(*)::int', 'count')
            .addSelect('MIN(ticket.expiredAt)', 'earliestExpiredAt')
            .where('ticket.userId = :userId', { userId })
            .andWhere('ticket.status = :status', { status: TicketStatus.AVAILABLE })
            .andWhere('ticket.expiredAt > :now', { now })
            .andWhere('ticket.expiredAt <= :expiredBefore', { expiredBefore })
            .groupBy('ticket.type')
            .getRawMany<ExpiringTicketInfo>();

        return rows;
    }

    async countAvailableGroupedByUserAndType(): Promise<TicketCountByUserAndType[]> {
        return this.ticketRepository
            .createQueryBuilder('ticket')
            .select('ticket.userId', 'userId')
            .addSelect('ticket.type', 'type')
            .addSelect('COUNT(*)::int', 'count')
            .where('ticket.status = :status', { status: TicketStatus.AVAILABLE })
            .groupBy('ticket.userId')
            .addGroupBy('ticket.type')
            .getRawMany<TicketCountByUserAndType>();
    }

    async findByUserId(userId: number): Promise<Ticket[]> {
        return this.ticketRepository
            .createQueryBuilder('ticket')
            .where('ticket.userId = :userId', { userId })
            .orderBy('ticket.created_at', 'DESC')
            .getMany();
    }

    async findAllWithUserInfo({
        limit = 200,
        offset = 0,
    }: { limit?: number; offset?: number } = {}): Promise<TicketWithUserProjection[]> {
        return this.ticketRepository
            .createQueryBuilder('t')
            .innerJoin('users', 'u', 'u.id = t.user_id')
            .leftJoin('social_user', 'su', 'su.user_id = u.id')
            .select([
                't.id AS "ticketId"',
                'u.id AS "userId"',
                'u.name AS "userName"',
                'MIN(su.email) AS "userEmail"',
                't.type AS "type"',
                't.status AS "status"',
                't.source AS "source"',
                't.created_at AS "createdAt"',
                't.used_at AS "usedAt"',
                't.expired_at AS "expiredAt"',
            ])
            .groupBy('t.id')
            .addGroupBy('u.id')
            .orderBy('t.created_at', 'DESC')
            .offset(offset)
            .limit(limit)
            .getRawMany<TicketWithUserProjection>();
    }
}
