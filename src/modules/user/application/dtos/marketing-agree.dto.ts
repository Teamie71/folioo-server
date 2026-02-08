import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AgreeMarketingReqDTO {
    @ApiProperty({ description: '마케팅 수신 동의 여부', example: true })
    @IsBoolean()
    isMarketingAgreed: boolean;
}

export class AgreeMarketingResDTO {
    isMarketingAgreed: boolean;
    marketingAgreedAt: Date | null;
}
