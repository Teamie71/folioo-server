import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class SendInterviewChatReqDTO {
    @Transform(({ value }: { value: string }) => value?.trim())
    @IsString()
    @MinLength(1)
    @ApiProperty({
        example: '프로젝트에서 가장 어려웠던 의사결정은 무엇이었나요?',
        description: '사용자 메시지',
    })
    message: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ApiProperty({
        required: false,
        type: [String],
        example: ['file_1', 'file_2'],
        description: '참조할 파일 ID 목록',
    })
    fileIds?: string[];

    @IsOptional()
    @IsArray()
    @Type(() => Number)
    @IsInt({ each: true })
    @ApiProperty({
        required: false,
        type: [Number],
        example: [1, 2],
        description: '언급한 인사이트 ID 목록',
    })
    insightIds?: number[];
}

export class InterviewInternalDTO {
    experienceId: number;
    experienceName: string;
    sessionId: string | null;

    static of(source: {
        id: number;
        name: string;
        sessionId: string | null;
    }): InterviewInternalDTO {
        return {
            experienceId: source.id,
            experienceName: source.name,
            sessionId: source.sessionId,
        };
    }
}
