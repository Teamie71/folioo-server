import {
    Body,
    Controller,
    HttpStatus,
    Logger,
    Param,
    ParseIntPipe,
    Post,
    Req,
    Res,
} from '@nestjs/common';
import {
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SseRelayUtil } from 'src/common/utils/sse-relay.util';
import { InterviewFacade } from '../application/facades/interview.facade';
import { SendInterviewChatReqDTO } from '../application/dtos/interview.dto';

@ApiTags('Interview')
@Controller('interview/experiences')
export class InterviewController {
    private readonly logger = new Logger(InterviewController.name);
    private readonly sseErrorEventPayload = JSON.stringify({
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        reason: 'AI stream relay failed',
    });

    constructor(private readonly interviewFacade: InterviewFacade) {}

    @Post(':experienceId/session/stream')
    @SkipTransform()
    @ApiOperation({
        summary: '인터뷰 세션 생성 및 SSE 스트리밍',
        description:
            'experienceId를 기준으로 인터뷰 세션을 만들고 첫 AI 질문을 SSE 스트림으로 전달합니다.',
    })
    @ApiParam({ name: 'experienceId', description: '경험 정리 ID', example: 42 })
    @ApiProduces('text/event-stream')
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'AI SSE 스트림 응답',
        headers: {
            'x-session-id': {
                description: 'AI 서버에서 발급한 인터뷰 세션 ID',
                schema: { type: 'string' },
            },
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BAD_REQUEST,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.INTERNAL_SERVER_ERROR
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
            passThroughHeaders: ['x-session-id'],
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
    @ApiBody({ type: SendInterviewChatReqDTO })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BAD_REQUEST,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.INTERNAL_SERVER_ERROR
    )
    async sendChatStream(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number,
        @Body() body: SendInterviewChatReqDTO,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        const relayConnection = await this.interviewFacade.sendChatStream(
            userId,
            experienceId,
            body
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
}
