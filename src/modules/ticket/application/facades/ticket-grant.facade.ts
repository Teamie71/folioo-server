import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { TicketGrant } from '../../domain/entities/ticket-grant.entity';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { TicketGrantActorType } from '../../domain/enums/ticket-grant-actor-type.enum';
import { TicketGrantSourceType } from '../../domain/enums/ticket-grant-source-type.enum';
import { TicketSource } from '../../domain/enums/ticket-source.enum';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketGrantService } from '../services/ticket-grant.service';
import { TicketGrantNoticeService } from '../services/ticket-grant-notice.service';
import { TicketService } from '../services/ticket.service';
import {
    AdminTicketGrantItemResDTO,
    AdminTicketGrantListResDTO,
    TicketGrantNoticeResDTO,
} from '../dtos/ticket-grant-notice.dto';

type RewardItem = {
    type: TicketType;
    quantity: number;
};

type TicketIssueContext =
    | {
          source: TicketSource.PURCHASE;
          paymentId: number;
      }
    | {
          source: TicketSource.EVENT;
          eventParticipationId: number;
      }
    | {
          source: TicketSource.ADMIN;
      };

interface NoticeInput {
    title: string;
    body: string;
    ctaText?: string | null;
    ctaLink?: string | null;
    payload?: Record<string, unknown> | null;
    expiresAt?: Date | null;
}

interface IssueGrantParams {
    userId: number;
    rewards: RewardItem[];
    grantSourceType: TicketGrantSourceType;
    issueContext: TicketIssueContext;
    actorType: TicketGrantActorType;
    actorId?: string | null;
    sourceRefId?: number | null;
    reasonCode?: string | null;
    reasonText?: string | null;
    notice?: NoticeInput | null;
    expiredAt?: Date | null;
    grantedAt?: Date;
}

@Injectable()
export class TicketGrantFacade {
    constructor(
        private readonly ticketGrantService: TicketGrantService,
        private readonly ticketGrantNoticeService: TicketGrantNoticeService,
        private readonly ticketService: TicketService
    ) {}

    @Transactional()
    async issueGrantAndTickets(params: IssueGrantParams): Promise<TicketGrant> {
        const grant = new TicketGrant();
        grant.userId = params.userId;
        grant.sourceType = params.grantSourceType;
        grant.sourceRefId = params.sourceRefId ?? null;
        grant.actorType = params.actorType;
        grant.actorId = params.actorId ?? null;
        grant.reasonCode = params.reasonCode ?? null;
        grant.reasonText = params.reasonText ?? null;
        grant.rewardSnapshot = params.rewards;
        grant.grantedAt = params.grantedAt ?? new Date();

        const savedGrant = await this.ticketGrantService.save(grant);

        await this.ticketService.issueTickets(
            params.userId,
            {
                ...params.issueContext,
                ticketGrantId: savedGrant.id,
            },
            params.rewards,
            params.expiredAt
        );

        if (params.notice) {
            const notice = new TicketGrantNotice();
            notice.ticketGrantId = savedGrant.id;
            notice.userId = params.userId;
            notice.title = params.notice.title;
            notice.body = params.notice.body;
            notice.ctaText = params.notice.ctaText ?? null;
            notice.ctaLink = params.notice.ctaLink ?? null;
            notice.payload = params.notice.payload ?? null;
            notice.expiresAt = params.notice.expiresAt ?? null;
            await this.ticketGrantNoticeService.save(notice);
        }

        return savedGrant;
    }

    async getNextNotice(userId: number): Promise<TicketGrantNoticeResDTO | null> {
        const notice = await this.ticketGrantNoticeService.findNextPendingByUserId(userId);
        if (!notice) {
            return null;
        }

        return TicketGrantNoticeResDTO.from(notice);
    }

    @Transactional()
    async markNoticeShown(userId: number, noticeId: number): Promise<TicketGrantNoticeResDTO> {
        const notice = await this.ticketGrantNoticeService.markShown(userId, noticeId);
        return TicketGrantNoticeResDTO.from(notice);
    }

    @Transactional()
    async markNoticeDismissed(userId: number, noticeId: number): Promise<TicketGrantNoticeResDTO> {
        const notice = await this.ticketGrantNoticeService.markDismissed(userId, noticeId);
        return TicketGrantNoticeResDTO.from(notice);
    }

    async getAdminTicketGrants(): Promise<AdminTicketGrantListResDTO> {
        const rows = await this.ticketGrantService.getAdminGrantList();
        return AdminTicketGrantListResDTO.from(
            rows.map((row) => AdminTicketGrantItemResDTO.from(row))
        );
    }

    createDefaultNotice({
        title,
        rewardSummary,
        displayReason,
        ctaText,
        ctaLink,
        rewards,
        expiresAt,
    }: {
        title: string;
        rewardSummary: string;
        displayReason?: string | null;
        ctaText?: string | null;
        ctaLink?: string | null;
        rewards: RewardItem[];
        expiresAt?: Date | null;
    }): NoticeInput {
        const normalizedDisplayReason = this.normalizeDisplayReason(displayReason);
        const body = `${rewardSummary}이 지급되었어요.`;

        return {
            title,
            body,
            ctaText: ctaText ?? null,
            ctaLink: ctaLink ?? null,
            expiresAt: expiresAt ?? null,
            payload: {
                displayReason: normalizedDisplayReason,
                rewards,
            },
        };
    }

    normalizeDisplayReason(displayReason?: string | null): string | null {
        const trimmedDisplayReason = displayReason?.trim();
        if (!trimmedDisplayReason) {
            return null;
        }

        if (trimmedDisplayReason === '서비스 이용 불편에 대한 보상') {
            return '서비스 이용 불편에 대한';
        }

        return trimmedDisplayReason;
    }

    formatRewardSummary(rewards: RewardItem[]): string {
        return rewards
            .filter((reward) => reward.quantity > 0)
            .map((reward) => {
                if (reward.type === TicketType.EXPERIENCE) {
                    return `경험 정리 ${reward.quantity}회권`;
                }
                return `포트폴리오 첨삭 ${reward.quantity}회권`;
            })
            .join(' + ');
    }
}
