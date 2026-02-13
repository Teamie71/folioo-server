import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class TicketExpiringQueryReqDTO {
    @ApiProperty({
        example: 7,
        description: '만료 예정 조회 기간 (일 단위, 1~365)',
        required: false,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(365)
    days: number = 7;
}
