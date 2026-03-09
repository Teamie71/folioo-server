import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';
import { RewardConfigItem } from 'src/modules/event/domain/entities/event.entity';

/* ──────────────────── User Search ──────────────────── */

export class AdminUserSearchReqDTO {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    keyword?: string;
}

export class AdminUserItemResDTO {
    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ example: '김철수' })
    name: string;

    @ApiPropertyOptional({ example: 'user@email.com', nullable: true })
    email: string | null;

    @ApiPropertyOptional({ example: 'KAKAO', nullable: true })
    loginType: string | null;

    @ApiPropertyOptional({ example: '01012345678', nullable: true })
    phoneNum: string | null;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: 2, description: '잔여 경험 정리 이용권 수량' })
    experienceTickets: number;

    @ApiProperty({ example: 1, description: '잔여 포트폴리오 첨삭 이용권 수량' })
    correctionTickets: number;
}

export class AdminUserSearchResDTO {
    @ApiProperty({ type: [AdminUserItemResDTO] })
    users: AdminUserItemResDTO[];

    @ApiProperty({ example: 5 })
    total: number;

    static from(users: AdminUserItemResDTO[], total: number): AdminUserSearchResDTO {
        const dto = new AdminUserSearchResDTO();
        dto.users = users;
        dto.total = total;
        return dto;
    }
}

/* ──────────────── Manual Reward Events ──────────────── */

export class AdminManualRewardEventItemResDTO {
    @ApiProperty({ example: 'FEEDBACK' })
    code: string;

    @ApiProperty({ example: '피드백 제출' })
    title: string;

    @ApiProperty({ description: '이벤트 보상 설정', type: 'array' })
    rewardConfig: RewardConfigItem[];

    @ApiProperty({ example: false, description: '다중 보상 지급 허용 여부' })
    allowMultipleRewards: boolean;

    @ApiProperty({ example: false, description: '해당 유저에게 이미 보상 지급 완료 여부' })
    isGranted: boolean;
}

export class AdminManualRewardEventListResDTO {
    @ApiProperty({ type: [AdminManualRewardEventItemResDTO] })
    events: AdminManualRewardEventItemResDTO[];

    @ApiProperty({ example: 2 })
    total: number;

    static from(events: AdminManualRewardEventItemResDTO[]): AdminManualRewardEventListResDTO {
        const dto = new AdminManualRewardEventListResDTO();
        dto.events = events;
        dto.total = events.length;
        return dto;
    }
}

/* ──────────────── Custom Reward Item ──────────────── */

export class CustomRewardItemDTO {
    @ApiProperty({ enum: TicketType, description: '이용권 종류' })
    @IsEnum(TicketType)
    type: TicketType;

    @ApiProperty({ description: '수량 (1~10)', example: 1 })
    @IsInt()
    @Min(1)
    @Max(10)
    @Type(() => Number)
    quantity: number;
}

/* ──────────────── Grant Event Reward ──────────────── */

export class AdminGrantRewardReqDTO {
    @ApiProperty({ description: '보상 대상 사용자 ID', example: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    userId: number;

    @ApiPropertyOptional({
        description: '외부 제출 건 ID(멱등 키)',
        example: 'google-form-row-123',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    externalSubmissionId?: string;

    @ApiPropertyOptional({ description: '검토자 식별자', example: '김수빈' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    reviewedBy?: string;

    @ApiPropertyOptional({ description: '검토 메모', example: '유효 피드백 확인 완료' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reviewNote?: string;

    @ApiPropertyOptional({ description: '보상 안내 모달 생성 여부', example: true })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    createNotice?: boolean;

    @ApiPropertyOptional({
        description:
            '커스텀 보상 (allowMultipleRewards 이벤트 전용, 미지정 시 이벤트 rewardConfig 사용)',
        type: [CustomRewardItemDTO],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomRewardItemDTO)
    customRewards?: CustomRewardItemDTO[];
}

export class AdminGrantRewardResDTO {
    @ApiProperty({ example: 'FEEDBACK' })
    eventCode: string;

    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ enum: EventRewardStatus, example: EventRewardStatus.GRANTED })
    rewardStatus: EventRewardStatus;

    @ApiProperty({ example: '2026-03-05T08:30:00.000Z' })
    rewardGrantedAt: string;
}

/* ──────────────── Internal Interfaces ──────────────── */

export interface GrantRewardByUserIdParams {
    userId: number;
    externalSubmissionId?: string;
    reviewedBy?: string;
    reviewNote?: string;
    createNotice?: boolean;
    customRewards?: CustomRewardItemDTO[];
}
