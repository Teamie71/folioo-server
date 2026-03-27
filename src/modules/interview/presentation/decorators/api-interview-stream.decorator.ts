import { applyDecorators } from '@nestjs/common';
import {
    ApiBody,
    ApiConsumes,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    getSchemaPath,
} from '@nestjs/swagger';
import {
    StreamContentBlockDeltaDTO,
    StreamMessageCompleteDTO,
    StreamPingDTO,
    StreamRetrieverResultDTO,
    StreamRetrieverStatusDTO,
} from '../../application/dtos/interview-stream.res.dto';

export function ApiInterviewStreamResponse() {
    return applyDecorators(
        ApiExtraModels(
            StreamRetrieverStatusDTO,
            StreamRetrieverResultDTO,
            StreamPingDTO,
            StreamContentBlockDeltaDTO,
            StreamMessageCompleteDTO
        ),
        ApiOperation({
            summary: '인터뷰 채팅 메시지 전송 및 SSE 스트리밍',
            description: `
**[프론트엔드 연동 가이드]**
SSE 스트림의 \`type\` 필드를 확인하여 이벤트별로 분기 처리해 주세요.
            `,
        }),
        ApiOkResponse({
            description: 'SSE 이벤트 데이터 (5가지 타입 중 하나)',
            schema: {
                oneOf: [
                    { $ref: getSchemaPath(StreamRetrieverStatusDTO) },
                    { $ref: getSchemaPath(StreamRetrieverResultDTO) },
                    { $ref: getSchemaPath(StreamPingDTO) },
                    { $ref: getSchemaPath(StreamContentBlockDeltaDTO) },
                    { $ref: getSchemaPath(StreamMessageCompleteDTO) },
                ],
            },
        })
    );
}

export function ApiInterviewStreamRequest() {
    return applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: '사용자 메시지',
                        example: '프로젝트 보고서 첨부합니다',
                    },
                    insightId: {
                        type: 'integer',
                        description: '언급한 인사이트 ID (양의 정수).',
                        example: 1,
                        minimum: 1,
                    },
                    files: {
                        type: 'array',
                        items: {
                            type: 'string',
                            format: 'binary',
                        },
                        description: '첨부 파일 (application/pdf 또는 image/*, 최대 3개)',
                    },
                },
                required: ['message'],
            },
        })
    );
}

export function ApiInterviewStreamStartResponse() {
    return applyDecorators(
        ApiExtraModels(
            StreamRetrieverStatusDTO,
            StreamRetrieverResultDTO,
            StreamPingDTO,
            StreamContentBlockDeltaDTO,
            StreamMessageCompleteDTO
        ),
        ApiOperation({
            summary: '인터뷰 세션 시작 및 SSE 스트리밍',
            description: `
**[프론트엔드 연동 가이드]**
SSE 스트림의 \`type\` 필드를 확인하여 이벤트별로 분기 처리해 주세요.
            `,
        }),
        ApiOkResponse({
            description: 'SSE 이벤트 데이터 (2가지 타입 중 하나)',
            schema: {
                oneOf: [
                    { $ref: getSchemaPath(StreamContentBlockDeltaDTO) },
                    { $ref: getSchemaPath(StreamMessageCompleteDTO) },
                ],
            },
        })
    );
}
