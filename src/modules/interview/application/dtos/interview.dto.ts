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

interface AiInsightPayload {
    id: string;
    title: string;
    activity_name: string;
    category: string;
    content: string;
    similarity_score: number | null;
    source: string;
}

interface AiInsightTurnHistoryItem {
    turn_number: number;
    user_message: string;
    mentioned_insight: string | null;
    insights: AiInsightPayload[];
}

export interface AiInterviewSessionStateResponse {
    messages: AiInterviewMessagePayload[];
    experience_name: string;
    current_stage: number;
    all_complete: boolean;
    turn_number: number;
    insight_turn_history: AiInsightTurnHistoryItem[];
}

export class InterviewMessageResDTO {
    @ApiProperty({ example: 'ai', description: '메시지를 보낸 주체 (ai/human 등)' })
    type: string;

    @ApiProperty({ example: '안녕하세요! 경험 정리를 도와드릴게요.', description: '메시지 본문' })
    content: string;
}

export class InsightSummaryResDTO {
    @ApiProperty({ example: '60', description: '인사이트 ID (문자열)' })
    id: string;

    @ApiProperty({ example: '로그로그' })
    title: string;

    @ApiProperty({ example: '마케팅 인턴' })
    activityName: string;

    @ApiProperty({ example: '기타' })
    category: string;

    @ApiProperty({ example: '10:57' })
    content: string;

    @ApiProperty({ example: null, nullable: true, type: Number })
    similarityScore: number | null;

    @ApiProperty({ example: 'mention', description: '검색 소스 (mention | rag 등)' })
    source: string;
}

export class InsightTurnHistoryItemResDTO {
    @ApiProperty({ example: 1, description: '턴 번호' })
    turnNumber: number;

    @ApiProperty({ example: '로그멘션이 잘 되는지 확인하고 싶어', description: '사용자 메시지' })
    userMessage: string;

    @ApiProperty({ example: '60', nullable: true, type: String, description: '언급된 인사이트 ID' })
    mentionedInsight: string | null;

    @ApiProperty({ type: [InsightSummaryResDTO], description: '이 턴에서 사용된 인사이트 목록' })
    insights: InsightSummaryResDTO[];
}

export class InterviewSessionStateResDTO {
    static fromAiPayload(payload: AiInterviewSessionStateResponse): InterviewSessionStateResDTO {
        return {
            messages: payload.messages.map((message) => ({
                type: message.type,
                content: message.content,
            })),
            experienceName: payload.experience_name,
            currentStage: payload.current_stage,
            allComplete: payload.all_complete,
            turnNumber: payload.turn_number,
            insightTurnHistory: payload.insight_turn_history.map((item) => ({
                turnNumber: item.turn_number,
                userMessage: item.user_message,
                mentionedInsight: item.mentioned_insight,
                insights: item.insights.map((insight) => ({
                    id: insight.id,
                    title: insight.title,
                    activityName: insight.activity_name,
                    category: insight.category,
                    content: insight.content,
                    similarityScore: insight.similarity_score,
                    source: insight.source,
                })),
            })),
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

    @ApiProperty({ example: 2, description: '현재 턴 번호' })
    turnNumber: number;

    @ApiProperty({ type: [InsightTurnHistoryItemResDTO], description: '인사이트 멘션 턴 이력' })
    insightTurnHistory: InsightTurnHistoryItemResDTO[];
}
