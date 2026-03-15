import { ApiProperty } from '@nestjs/swagger';

// --- 1. RAG 진행 상태 (retriever_status) ---
export class StreamRetrieverStatusDTO {
    @ApiProperty({ example: 'retriever_status' })
    type: string;

    @ApiProperty({ example: '대화 내용을 바탕으로 유사도가 높은 인사이트 로그를 읽었어요.' })
    message: string;
}

// --- 2. RAG 검색 결과 (retriever_result) ---
export class StreamRetrieverInsightDTO {
    @ApiProperty({ example: '60', description: '인사이트 ID (문자열)' })
    id: string;

    @ApiProperty({ example: '로그로그' })
    title: string;

    @ApiProperty({ example: '마케팅 인턴' })
    activity_name: string;

    @ApiProperty({ example: '기타' })
    category: string;

    @ApiProperty({ example: '10:57' })
    content: string;

    @ApiProperty({ example: null, nullable: true, type: Number })
    similarity_score: number | null;

    @ApiProperty({ example: 'mention', description: '검색 소스 (mention | rag 등)' })
    source: string;
}

export class StreamRetrieverResultDTO {
    @ApiProperty({ example: 'retriever_result' })
    type: string;

    @ApiProperty({ type: [StreamRetrieverInsightDTO], description: '검색된 인사이트 배열' })
    insights: StreamRetrieverInsightDTO[];
}

// --- 3. 연결 유지용 Ping (ping) ---
export class StreamPingDTO {
    @ApiProperty({ example: 'ping' })
    type: string;

    @ApiProperty({ example: '2026-03-04T08:41:30.524871+00:00' })
    timestamp: string;
}

// --- 4. 텍스트 청크 (content_block_delta) - 이전과 동일 ---
class StreamDeltaPayloadDTO {
    @ApiProperty({ example: 'text_delta' })
    type: string;
    @ApiProperty({ example: '안' })
    text: string;
}
export class StreamContentBlockDeltaDTO {
    @ApiProperty({ example: 'content_block_delta' })
    type: string;
    @ApiProperty({ type: StreamDeltaPayloadDTO })
    delta: StreamDeltaPayloadDTO;
}

// --- 5. 최종 메시지 완료 (message_complete) - 구조 업데이트 ---
class StageProgressDTO {
    @ApiProperty({ example: 2 }) fixed_q_used: number;
    @ApiProperty({ example: 3 }) fixed_q_total: number;
    @ApiProperty({ example: 0 }) generated_q_used: number;
    @ApiProperty({ example: 2 }) generated_q_max: number;
    @ApiProperty({ example: false }) force_all_generated_q: boolean;
    @ApiProperty({ example: false }) is_complete: boolean;
}

class StreamMessagePayloadDTO {
    @ApiProperty({ description: 'AI의 최종 전체 응답 내용', example: '네, 잘 들었습니다. ...' })
    ai_response: string;

    @ApiProperty({ example: 1 })
    current_stage: number;

    @ApiProperty({ type: StageProgressDTO })
    stage_progress: StageProgressDTO;

    @ApiProperty({ description: '전체 진행률 (0~1)', example: 0.0 })
    overall_completion: number;

    @ApiProperty({ description: '모든 인터뷰 완료 여부', example: false })
    all_complete: boolean;
}

export class StreamMessageCompleteDTO {
    @ApiProperty({ example: 'message_complete' })
    type: string;

    @ApiProperty({ type: StreamMessagePayloadDTO })
    message: StreamMessagePayloadDTO;
}
