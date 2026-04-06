import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getEndOfThisSeoulWeekSunday } from 'src/common/utils/seoul-date.util';
import { TicketGrantFacade } from 'src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import { TicketGrantActorType } from 'src/modules/ticket/domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from 'src/modules/ticket/domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from 'src/modules/ticket/domain/enums/ticket-source.enum';
import { UserService } from 'src/modules/user/application/services/user.service';
import {
    KST_TIME_ZONE,
    WEEKLY_EVENT_ACTOR_ID,
    WEEKLY_EVENT_BATCH_SIZE,
    WEEKLY_EVENT_NOTICE_BODY,
    WEEKLY_EVENT_NOTICE_CTA_LINK,
    WEEKLY_EVENT_NOTICE_CTA_TEXT,
    WEEKLY_EVENT_NOTICE_DISPLAY_PERIOD,
    WEEKLY_EVENT_NOTICE_TITLE,
    WEEKLY_EVENT_REASON_CODE,
    WEEKLY_EVENT_REASON_TEXT,
    WEEKLY_EVENT_REWARDS,
    WEEKLY_EVENT_TICKET_CRON,
} from './weekly-event-ticket.constants';

@Injectable()
export class WeeklyEventTicketScheduler {
    private readonly logger = new Logger(WeeklyEventTicketScheduler.name);

    constructor(
        private readonly userService: UserService,
        private readonly ticketService: TicketService,
        private readonly ticketGrantFacade: TicketGrantFacade
    ) {}

    @Cron(WEEKLY_EVENT_TICKET_CRON, { timeZone: KST_TIME_ZONE })
    async issueWeeklyEventTickets(): Promise<void> {
        const now = new Date();
        const expiredCount = await this.ticketService.expireOutdatedAvailableTickets(now);
        const activeUserIds = await this.userService.findAllActiveUserIds();
        const expiresAt = getEndOfThisSeoulWeekSunday(now);
        let failedIssueCount = 0;

        for (let index = 0; index < activeUserIds.length; index += WEEKLY_EVENT_BATCH_SIZE) {
            const batch = activeUserIds.slice(index, index + WEEKLY_EVENT_BATCH_SIZE);

            const issueResults = await Promise.allSettled(
                batch.map((userId) =>
                    this.ticketGrantFacade.issueGrantAndTickets({
                        userId,
                        rewards: WEEKLY_EVENT_REWARDS,
                        grantSourceType: TicketGrantSourceType.ADMIN,
                        issueContext: {
                            source: TicketSource.ADMIN,
                        },
                        actorType: TicketGrantActorType.SYSTEM,
                        actorId: WEEKLY_EVENT_ACTOR_ID,
                        reasonCode: WEEKLY_EVENT_REASON_CODE,
                        reasonText: WEEKLY_EVENT_REASON_TEXT,
                        notice: {
                            title: WEEKLY_EVENT_NOTICE_TITLE,
                            body: WEEKLY_EVENT_NOTICE_BODY,
                            expiresAt,
                            ctaText: WEEKLY_EVENT_NOTICE_CTA_TEXT,
                            ctaLink: WEEKLY_EVENT_NOTICE_CTA_LINK,
                            payload: {
                                rewards: WEEKLY_EVENT_REWARDS,
                                displayReason: WEEKLY_EVENT_NOTICE_TITLE,
                                displayPeriod: WEEKLY_EVENT_NOTICE_DISPLAY_PERIOD,
                            },
                        },
                        expiredAt: expiresAt,
                        grantedAt: now,
                    })
                )
            );

            issueResults.forEach((result, resultIndex) => {
                if (result.status === 'fulfilled') {
                    return;
                }

                failedIssueCount += 1;
                const failedUserId = batch[resultIndex];
                const reasonMessage =
                    result.reason instanceof Error ? result.reason.message : String(result.reason);

                this.logger.error(
                    `Weekly event ticket issue failed. userId=${failedUserId}, reason=${reasonMessage}`
                );
            });
        }

        this.logger.log(
            `Weekly event tickets issued. activeUsers=${activeUserIds.length}, expiredTickets=${expiredCount}, failedIssues=${failedIssueCount}, expiresAt=${expiresAt.toISOString()}`
        );
    }
}
