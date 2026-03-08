import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketGrantNoticeStatus } from '../../domain/enums/ticket-grant-notice-status.enum';
import { TicketGrantSourceType } from '../../domain/enums/ticket-grant-source-type.enum';
import { TicketGrantNotice } from '../../domain/entities/ticket-grant-notice.entity';
import { AdminTicketGrantProjection } from '../../infrastructure/repositories/ticket-grant.repository';

export class TicketGrantRewardItemResDTO {
    @ApiProperty({ enum: TicketType, example: TicketType.EXPERIENCE })
    type: TicketType;

    @ApiProperty({ example: 1 })
    quantity: number;
}

export class TicketGrantNoticePayloadResDTO {
    @ApiPropertyOptional({ example: '서비스 이용 불편에 대한 보상', nullable: true })
    displayReason?: string;

    @ApiPropertyOptional({ type: [TicketGrantRewardItemResDTO] })
    rewards?: TicketGrantRewardItemResDTO[];
}

export class TicketGrantNoticeResDTO {
    @ApiProperty({ example: 101 })
    id: number;

    @ApiProperty({ example: 55 })
    ticketGrantId: number;

    @ApiProperty({ enum: TicketGrantNoticeStatus, example: TicketGrantNoticeStatus.PENDING })
    status: TicketGrantNoticeStatus;

    @ApiProperty({ example: '보상이 지급되었어요' })
    title: string;

    @ApiProperty({ example: '경험 정리 1회권이 지급되었어요.' })
    body: string;

    @ApiPropertyOptional({ example: '첨삭 의뢰하기', nullable: true })
    ctaText: string | null;

    @ApiPropertyOptional({ example: '/correction/new', nullable: true })
    ctaLink: string | null;

    @ApiPropertyOptional({ type: TicketGrantNoticePayloadResDTO, nullable: true })
    payload: TicketGrantNoticePayloadResDTO | null;

    @ApiProperty({ example: '2026-03-08T00:00:00.000Z' })
    createdAt: string;

    static from(notice: TicketGrantNotice): TicketGrantNoticeResDTO {
        const dto = new TicketGrantNoticeResDTO();
        dto.id = notice.id;
        dto.ticketGrantId = notice.ticketGrantId;
        dto.status = notice.status;
        dto.title = notice.title;
        dto.body = notice.body;
        dto.ctaText = notice.ctaText;
        dto.ctaLink = notice.ctaLink;
        dto.payload = (notice.payload as TicketGrantNoticePayloadResDTO | null) ?? null;
        dto.createdAt = notice.createdAt.toISOString();
        return dto;
    }
}

export class AdminTicketGrantItemResDTO {
    @ApiProperty({ example: 1 })
    grantId: number;

    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ example: '김효인' })
    userName: string;

    @ApiPropertyOptional({ example: 'hyoin@test.com', nullable: true })
    userEmail: string | null;

    @ApiProperty({ enum: TicketGrantSourceType, example: TicketGrantSourceType.ADMIN })
    sourceType: TicketGrantSourceType;

    @ApiPropertyOptional({ example: 'feedback_reward', nullable: true })
    reasonCode: string | null;

    @ApiPropertyOptional({ example: '유효 피드백 확인 완료', nullable: true })
    reasonText: string | null;

    @ApiProperty({ type: [TicketGrantRewardItemResDTO] })
    rewardSnapshot: TicketGrantRewardItemResDTO[];

    @ApiProperty({ example: '2026-03-08T00:00:00.000Z' })
    grantedAt: string;

    @ApiPropertyOptional({ example: 10, nullable: true })
    noticeId: number | null;

    @ApiPropertyOptional({ enum: TicketGrantNoticeStatus, nullable: true })
    noticeStatus: TicketGrantNoticeStatus | null;

    @ApiPropertyOptional({ example: '2026-03-08T00:01:00.000Z', nullable: true })
    noticeShownAt: string | null;

    @ApiPropertyOptional({ example: null, nullable: true })
    noticeDismissedAt: string | null;

    static from(projection: AdminTicketGrantProjection): AdminTicketGrantItemResDTO {
        const dto = new AdminTicketGrantItemResDTO();
        dto.grantId = Number(projection.grantId);
        dto.userId = Number(projection.userId);
        dto.userName = projection.userName;
        dto.userEmail = projection.userEmail;
        dto.sourceType = projection.sourceType as TicketGrantSourceType;
        dto.reasonCode = projection.reasonCode;
        dto.reasonText = projection.reasonText;
        dto.rewardSnapshot = (projection.rewardSnapshot as TicketGrantRewardItemResDTO[]) ?? [];
        dto.grantedAt = new Date(projection.grantedAt).toISOString();
        dto.noticeId = projection.noticeId ? Number(projection.noticeId) : null;
        dto.noticeStatus = projection.noticeStatus;
        dto.noticeShownAt = projection.noticeShownAt
            ? new Date(projection.noticeShownAt).toISOString()
            : null;
        dto.noticeDismissedAt = projection.noticeDismissedAt
            ? new Date(projection.noticeDismissedAt).toISOString()
            : null;
        return dto;
    }
}

export class AdminTicketGrantListResDTO {
    @ApiProperty({ type: [AdminTicketGrantItemResDTO] })
    grants: AdminTicketGrantItemResDTO[];

    @ApiProperty({ example: 3 })
    total: number;

    static from(grants: AdminTicketGrantItemResDTO[]): AdminTicketGrantListResDTO {
        const dto = new AdminTicketGrantListResDTO();
        dto.grants = grants;
        dto.total = grants.length;
        return dto;
    }
}
