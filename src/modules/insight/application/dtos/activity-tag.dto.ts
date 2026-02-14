import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ActivityNameReqDTO {
    @ApiProperty({ description: '활동 태그 이름', example: '프로젝트' })
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(20)
    name: string;
}

export class ActivityNameResDTO {
    id: number;
    name: string;
}
