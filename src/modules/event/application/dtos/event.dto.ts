import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventRewardStatus } from '../../domain/enums/event-reward-status.enum';

export enum FeedbackModalVariant {
    REWARD_AVAILABLE = 'REWARD_AVAILABLE',
    REWARDED = 'REWARDED',
}

export class FeedbackModalResDTO {
    @ApiProperty({ example: 'FEEDBACK_REWARD' })
    eventCode: string;

    @ApiProperty({ enum: FeedbackModalVariant, example: FeedbackModalVariant.REWARD_AVAILABLE })
    variant: FeedbackModalVariant;

    @ApiProperty({ enum: EventRewardStatus, example: EventRewardStatus.NOT_GRANTED })
    rewardStatus: EventRewardStatus;

    @ApiProperty({ example: '사용 후기 남기고, 원하는 이용권 받으세요!' })
    title: string;

    @ApiProperty({ example: '첫 피드백을 남겨주시면 이용권을 지급해요.' })
    description: string;

    @ApiProperty({ example: '피드백 남기기' })
    ctaText: string;

    @ApiPropertyOptional({ example: 'https://forms.gle/example', nullable: true })
    ctaLink: string | null;
}

export class EventProgressCardResDTO {
    @ApiProperty({ example: 'INSIGHT_LOG_CHALLENGE' })
    eventCode: string;

    @ApiProperty({ example: '인사이트 로그 작성 챌린지' })
    title: string;

    @ApiProperty({ example: '오늘의 인사이트 로그 작성 챌린지 참여 완료!' })
    subtitle: string;

    @ApiProperty({ example: '9개의 로그를 더 작성하고 보상을 받으세요.' })
    content: string;

    @ApiProperty({ example: 1 })
    progress: number;

    @ApiProperty({ example: 10 })
    target: number;

    @ApiProperty({ example: 9 })
    remaining: number;

    @ApiProperty({ example: false })
    isCompleted: boolean;

    @ApiProperty({ enum: EventRewardStatus, example: EventRewardStatus.NOT_GRANTED })
    rewardStatus: EventRewardStatus;

    @ApiProperty({ example: '오늘의 로그 작성하기' })
    ctaText: string;

    @ApiPropertyOptional({ example: '/insights', nullable: true })
    ctaLink: string | null;
}

export class ClaimEventRewardResDTO {
    @ApiProperty({ example: 'INSIGHT_LOG_CHALLENGE' })
    eventCode: string;

    @ApiProperty({ enum: EventRewardStatus, example: EventRewardStatus.GRANTED })
    rewardStatus: EventRewardStatus;

    @ApiProperty({ example: '2026-02-26T00:00:00.000Z' })
    rewardGrantedAt: string;
}
