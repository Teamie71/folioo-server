import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getEndOfThisSeoulWeekSunday } from 'src/common/utils/seoul-date.util';
import { UserService } from 'src/modules/user/application/services/user.service';
import { TicketGrantActorType } from '../../domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from '../../domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from '../../domain/enums/ticket-source.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketGrantFacade } from '../facades/ticket-grant.facade';
import { TicketService } from '../services/ticket.service';

const WEEKLY_REWARDS = [
    { type: TicketType.EXPERIENCE, quantity: 3 },
    { type: TicketType.PORTFOLIO_CORRECTION, quantity: 5 },
];

@Injectable()
export class WeeklyEventTicketScheduler {
    private readonly logger = new Logger(WeeklyEventTicketScheduler.name);

    constructor(
        private readonly userService: UserService,
        private readonly ticketService: TicketService,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

    @Cron('0 0 * * 1', { timeZone: 'Asia/Seoul' })
    async issueWeeklyEventTickets(): Promise<void> {
        const now = new Date();
        const expiredCount = await this.ticketService.expireOutdatedAvailableTickets(now);
        const activeUserIds = await this.userService.findAllActiveUserIds();
        const expiresAt = getEndOfThisSeoulWeekSunday(now);

        const batchSize = 200;
        for (let index = 0; index < activeUserIds.length; index += batchSize) {
            const batch = activeUserIds.slice(index, index + batchSize);

            await Promise.all(
                batch.map((userId) =>
                    this.ticketGrantFacade.issueGrantAndTickets({
                        userId,
                        rewards: WEEKLY_REWARDS,
                        grantSourceType: TicketGrantSourceType.EVENT,
                        issueContext: {
                            source: TicketSource.ADMIN,
                        },
                        actorType: TicketGrantActorType.SYSTEM,
                        actorId: 'weekly-event-ticket-scheduler',
                        reasonCode: 'weekly_event_free_ticket',
                        reasonText: '주간 무료 이용권 자동 지급',
                        notice: {
                            title: '이번 주의 무료 이용권',
                            body: '경험 정리 3회권 + 포트폴리오 첨삭 5회권',
                            expiresAt,
                            ctaText: '첨삭 의뢰하기',
                            ctaLink: '/correction/new',
                            payload: {
                                rewards: WEEKLY_REWARDS,
                                displayReason: '이번 주의 무료 이용권',
                                displayPeriod: '일요일까지',
                            },
                        },
                        expiredAt: expiresAt,
                        grantedAt: now,
                    })
                )
            );
        }

        this.logger.log(
            `Weekly event tickets issued. activeUsers=${activeUserIds.length}, expiredTickets=${expiredCount}, expiresAt=${expiresAt.toISOString()}`
        );
    }
}
