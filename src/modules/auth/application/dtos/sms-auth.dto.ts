import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class SendSmsReqDto {
    @ApiProperty({ description: '전화번호', example: '01012345678' })
    @IsString()
    @IsPhoneNumber('KR')
    phoneNum: string;
}

export class VerifySmsReqDto {
    @ApiProperty({ description: '전화번호', example: '01012345678' })
    @IsString()
    @IsPhoneNumber('KR')
    phoneNum: string;

    @ApiProperty({ description: '전송받은 6자리 인증 코드', example: '123456' })
    @IsString()
    @Length(6, 6)
    verifyToken: string;
}
