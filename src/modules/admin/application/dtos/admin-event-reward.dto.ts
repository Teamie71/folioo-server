import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';
import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';

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

    @ApiPropertyOptional({ description: '검토자 식별자', example: 'pm.lee' })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    reviewedBy?: string;

    @ApiPropertyOptional({ description: '보상 메모', example: '유효 피드백 확인 완료' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reviewNote?: string;
}

export class AdminGrantRewardResDTO {
    @ApiProperty({ example: 'FEEDBACK_REWARD' })
    eventCode: string;

    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ enum: EventRewardStatus, example: EventRewardStatus.GRANTED })
    rewardStatus: EventRewardStatus;

    @ApiProperty({ example: '2026-03-05T08:30:00.000Z' })
    rewardGrantedAt: string;
}

export class AdminGrantTicketsReqDTO {
    @ApiProperty({ description: '대상 사용자 ID', example: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    userId: number;

    @ApiProperty({
        description: '이용권 종류',
        enum: TicketType,
        example: TicketType.EXPERIENCE,
    })
    @IsEnum(TicketType)
    type: TicketType;

    @ApiProperty({ description: '지급 수량 (1~10)', example: 1 })
    @IsInt()
    @Min(1)
    @Max(10)
    @Type(() => Number)
    quantity: number;

    @ApiProperty({ description: '지급 사유', example: '피드백 제출' })
    @IsString()
    @MaxLength(200)
    reason: string;
}

export class AdminGrantTicketsResDTO {
    @ApiProperty({ example: 1 })
    userId: number;

    @ApiProperty({ enum: TicketType, example: TicketType.EXPERIENCE })
    type: TicketType;

    @ApiProperty({ example: 1 })
    quantity: number;

    @ApiProperty({ example: '피드백 제출' })
    reason: string;

    @ApiProperty({ example: 3, description: '지급 후 해당 타입 잔여 수량' })
    remainingBalance: number;
}
