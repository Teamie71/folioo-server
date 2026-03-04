import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

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
    @Type(() => Number)
    @IsInt()
    @ApiProperty({
        required: false,
        type: Number,
        example: 1,
        description: '언급한 인사이트 ID (단일)',
    })
    insightId?: number;
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

export interface AiInterviewMessagePayload {
    type: string;
    content: string;
}

export interface AiInterviewSessionStateResponse {
    messages: AiInterviewMessagePayload[];
    experience_name: string;
    current_stage: number;
    all_complete: boolean;
}

export class InterviewMessageResDTO {
    @ApiProperty({ example: 'ai', description: '메시지를 보낸 주체 (ai/human 등)' })
    type: string;

    @ApiProperty({ example: '안녕하세요! 경험 정리를 도와드릴게요.', description: '메시지 본문' })
    content: string;
}

export class InterviewSessionStateResDTO {
    static fromAiPayload(payload: {
        messages: { type: string; content: string }[];
        experience_name: string;
        current_stage: number;
        all_complete: boolean;
    }): InterviewSessionStateResDTO {
        return {
            messages: payload.messages.map((message) => ({
                type: message.type,
                content: message.content,
            })),
            experienceName: payload.experience_name,
            currentStage: payload.current_stage,
            allComplete: payload.all_complete,
        };
    }

    @ApiProperty({ type: [InterviewMessageResDTO], description: '현재까지의 인터뷰 메시지 목록' })
    messages: InterviewMessageResDTO[];

    @ApiProperty({ example: '마케팅 인턴 경험', description: '경험 정리 이름' })
    experienceName: string;

    @ApiProperty({ example: 1, description: '현재 인터뷰 단계 (1~n)' })
    currentStage: number;

    @ApiProperty({ example: false, description: '인터뷰 전 과정을 모두 완료했는지 여부' })
    allComplete: boolean;
}
