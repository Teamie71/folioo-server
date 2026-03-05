import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EventRewardStatus } from 'src/modules/event/domain/enums/event-reward-status.enum';

export class AdminUserSearchQueryDTO {
    @IsString()
    @MinLength(1)
    @MaxLength(25)
    name: string;
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
