import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserProfileResDto {
    name: string;
    email: string;
    phoneNum: string | null;
    //TODO: 마케팅 정보 수신 동의 여부 및 약관 관련 필드 추가 필요함
    isMarketingAgreed: boolean;
}

export class UpdateUserNameReqDto {
    @ApiProperty({ description: '변경하고자 하는 닉네임을 입력합니다.', example: '새로운 닉네임' })
    @IsString()
    name: string;
}
