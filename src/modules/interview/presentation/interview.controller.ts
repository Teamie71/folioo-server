import { Controller, Get, Logger, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SseRelayUtil } from 'src/common/utils/sse-relay.util';
import { GeneratePortfolioResDTO } from 'src/modules/experience/application/dtos/experience.dto';
import { InterviewFacade } from '../application/facades/interview.facade';
import {
    InterviewSessionStateResDTO,
    SendInterviewChatReqDTO,
} from '../application/dtos/interview.dto';
import {
    ApiInterviewStreamResponse,
    ApiInterviewStreamRequest,
    ApiInterviewStreamStartResponse,
} from './decorators/api-interview-stream.decorator';
import { InterviewChatStreamRequestParserService } from './services/interview-chat-stream-request-parser.service';

@ApiTags('Interview')
@Controller('interview/experiences')
export class InterviewController {
    private readonly logger = new Logger(InterviewController.name);
    private readonly sseErrorEventPayload = JSON.stringify({
        errorCode: ErrorCode.INTERVIEW_AI_RELAY_FAILED,
        reason: 'AI stream relay failed',
    });

    constructor(
        private readonly interviewFacade: InterviewFacade,
        private readonly interviewChatStreamRequestParser: InterviewChatStreamRequestParserService
    ) {}

    @Post(':experienceId/session/stream')
    @SkipTransform()
    @ApiOperation({
        summary: '인터뷰 세션 생성 및 SSE 스트리밍',
        description:
            'experienceId를 기준으로 인터뷰 세션을 만들고 첫 AI 질문을 SSE 스트림으로 전달합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiProduces('text/event-stream')
    @ApiInterviewStreamStartResponse()
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.EXPERIENCE_SESSION_ALREADY_EXISTS,
        ErrorCode.INTERVIEW_AI_RELAY_FAILED
    )
    async createSessionStream(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        const relayConnection = await this.interviewFacade.createSessionStream(
            userId,
            experienceId
        );
        SseRelayUtil.relayStream({
            connection: relayConnection,
            request: req,
            response: res,
            logger: this.logger,
            errorLogPrefix: 'Interview SSE relay error',
            errorEventPayload: this.sseErrorEventPayload,
        });
    }

    @Post(':experienceId/messages/stream')
    @SkipTransform()
    @ApiOperation({
        summary: '인터뷰 채팅 메시지 전송 및 SSE 스트리밍',
        description:
            'experienceId로 저장된 sessionId를 조회해 사용자 메시지를 전송하고 AI 응답을 SSE 스트림으로 전달합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiProduces('text/event-stream')
    @ApiInterviewStreamRequest()
    @ApiInterviewStreamResponse()
    @ApiCommonErrorResponse(
        ErrorCode.BAD_REQUEST,
        ErrorCode.INTERVIEW_MULTIPART_INVALID_CONTENT_TYPE,
        ErrorCode.INTERVIEW_MULTIPART_FIELD_NAME_TOO_LONG,
        ErrorCode.INTERVIEW_MULTIPART_FIELD_VALUE_TOO_LARGE,
        ErrorCode.INTERVIEW_MESSAGE_EMPTY,
        ErrorCode.INTERVIEW_MESSAGE_REQUIRED,
        ErrorCode.INTERVIEW_INSIGHT_ID_INVALID,
        ErrorCode.INTERVIEW_FILE_FIELD_INVALID,
        ErrorCode.INTERVIEW_FILE_MIME_INVALID,
        ErrorCode.INTERVIEW_FILE_SIZE_EXCEEDED,
        ErrorCode.INTERVIEW_FILE_COUNT_EXCEEDED,
        ErrorCode.INTERVIEW_FIELD_COUNT_EXCEEDED,
        ErrorCode.INTERVIEW_PART_COUNT_EXCEEDED,
        ErrorCode.INTERVIEW_MULTIPART_INVALID_PAYLOAD,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
        ErrorCode.INTERVIEW_AI_RELAY_FAILED
    )
    async sendChatStream(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        const parsedRequest = await this.interviewChatStreamRequestParser.parse(req);
        const body: SendInterviewChatReqDTO = {
            message: parsedRequest.message,
            ...(parsedRequest.insightId !== undefined && {
                insightId: parsedRequest.insightId,
            }),
        };

        const relayConnection = await this.interviewFacade.sendChatStream(
            userId,
            experienceId,
            body,
            parsedRequest.files
        );
        SseRelayUtil.relayStream({
            connection: relayConnection,
            request: req,
            response: res,
            logger: this.logger,
            errorLogPrefix: 'Interview SSE relay error',
            errorEventPayload: this.sseErrorEventPayload,
        });
    }

    @Get(':experienceId/status')
    @ApiOperation({
        summary: '인터뷰 세션 상태 조회',
        description:
            'AI 서버에서 관리하는 인터뷰 세션 상태를 조회합니다. 메시지 목록과 진행 단계 정보를 포함합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiCommonResponse(InterviewSessionStateResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
        ErrorCode.INTERVIEW_AI_RELAY_FAILED
    )
    async getSessionState(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number
    ): Promise<InterviewSessionStateResDTO> {
        return this.interviewFacade.getSessionState(userId, experienceId);
    }

    @Post(':experienceId/portfolio/generate')
    @ApiOperation({
        summary: '포트폴리오 생성 시작',
        description:
            '경험 정리의 인터뷰 세션을 기반으로 포트폴리오 생성을 AI 서버에 위임합니다. 경험 상태가 ON_CHAT일 때만 요청 가능합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiCommonResponse(GeneratePortfolioResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.EXPERIENCE_SESSION_NOT_READY,
        ErrorCode.INTERVIEW_NOT_COMPLETED,
        ErrorCode.EXPERIENCE_INVALID_STATUS
    )
    async generatePortfolio(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number
    ): Promise<GeneratePortfolioResDTO> {
        return this.interviewFacade.generatePortfolio(experienceId, userId);
    }

    @Post(':experienceId/extend/stream')
    @SkipTransform()
    @ApiOperation({
        summary: '연장 모드 시작 (SSE 스트리밍)',
        description:
            '완료된 인터뷰 세션을 연장 모드로 전환하고 첫 질문을 SSE로 스트리밍합니다. 인터뷰가 모두 완료된 상태에서만 요청 가능합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiProduces('text/event-stream')
    @ApiInterviewStreamStartResponse()
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.INTERVIEW_SESSION_NOT_INITIALIZED,
        ErrorCode.INTERVIEW_EXTEND_NOT_ALLOWED,
        ErrorCode.INTERVIEW_AI_RELAY_FAILED
    )
    async extendSessionStream(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        const relayConnection = await this.interviewFacade.extendSessionStream(
            userId,
            experienceId
        );
        SseRelayUtil.relayStream({
            connection: relayConnection,
            request: req,
            response: res,
            logger: this.logger,
            errorLogPrefix: 'Interview extend SSE relay error',
            errorEventPayload: this.sseErrorEventPayload,
        });
    }
}
