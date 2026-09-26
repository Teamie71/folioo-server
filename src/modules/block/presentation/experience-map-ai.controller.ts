import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from 'src/common/decorators/user.decorator';
import { ExperienceMapTicketFacade } from '../application/facades/experience-map-ticket.facade';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    IssueReadTicketReqDTO,
    IssueReadTicketResDTO,
    IssueTicketReqDTO,
    IssueTicketResDTO,
} from '../application/dtos/experience-map-ticket.dto';
import { RevertReqDTO, RevertResDTO } from '../application/dtos/experience-map-revert.dto';
import { UsageResDTO } from '../application/dtos/experience-map-usage.dto';
import { AiAgentUsageService } from '../application/services/ai-agent-usage.service';

@ApiTags('ExperienceMap - AI Integration')
@Controller('api/v1/experience-map')
export class ExperienceMapAiController {
    constructor(
        private readonly experienceMapTicketFacade: ExperienceMapTicketFacade,
        private readonly experienceMapFacade: ExperienceMapFacade,
        private readonly aiAgentUsageService: AiAgentUsageService
    ) {}

    @Post('ticket')
    @ApiOperation({
        summary: 'AI 경험 정리 세션 티켓 발급',
        description:
            '프론트가 AI 서버에 SSE로 직결하기 전에 신원을 발급받습니다. ' +
            'AI 에이전트 세션은 활동(EXPERIENCE 블록)마다 하나이며, ' +
            '해당 활동의 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다. ' +
            'request_id를 body로 전달하면 새로 만들지 않고 그대로 재사용합니다(재시도 턴 유지). ' +
            '새 request_id면 일일 사용 한도(모든 에이전트 합산 10회)에서 1회 차감하고, 한도를 넘으면 429. ' +
            '이미 차감된 request_id의 재시도는 다시 차감하지 않으며, 실패 처리된 request_id를 재시도하면 다시 차감한다.',
    })
    @ApiCommonResponse(IssueTicketResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.EXPERIENCE_MAP_DAILY_LIMIT_EXCEEDED
    )
    async issueTicket(
        @User('sub') userId: number,
        @Body() body: IssueTicketReqDTO
    ): Promise<IssueTicketResDTO> {
        return this.experienceMapTicketFacade.issueTicket(userId, body.block_id, body.request_id);
    }

    @Post('ticket/read')
    @ApiOperation({
        summary: 'AI 경험 정리 대화 내역 조회용 티켓 발급',
        description:
            '프론트가 AI 서버에서 대화 내역을 조회할 때 쓰는 티켓을 발급합니다. ' +
            '일일 사용 한도를 차감하지 않으며, scope=read라 AI 서버는 이 티켓으로 턴을 실행하지 않습니다. ' +
            '해당 활동의 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다.',
    })
    @ApiCommonResponse(IssueReadTicketResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.BLOCK_NOT_FOUND)
    async issueReadTicket(
        @User('sub') userId: number,
        @Body() body: IssueReadTicketReqDTO
    ): Promise<IssueReadTicketResDTO> {
        return this.experienceMapTicketFacade.issueReadTicket(userId, body.block_id);
    }

    @Post('revert')
    @ApiOperation({
        summary: 'AI 커밋 되돌리기',
        description:
            '되돌리기도 하나의 변경이라 map_version은 증가한다. 맵 내용만 이전 시점과 같아진다. ' +
            '최신 AI 커밋이 아니거나 생성 후 24시간이 지나면 되돌릴 수 없다(410). ' +
            'AI 커밋 뒤 다른 변경으로 버전이 달라졌으면 409.',
    })
    @ApiCommonResponse(RevertResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_MAP_NOT_INITIALIZED,
        ErrorCode.EXPERIENCE_MAP_VERSION_CONFLICT,
        ErrorCode.EXPERIENCE_MAP_REVERT_EXPIRED
    )
    async revert(@User('sub') userId: number, @Body() body: RevertReqDTO): Promise<RevertResDTO> {
        return this.experienceMapFacade.revert(userId, body.request_id);
    }

    @Get('usage')
    @ApiOperation({
        summary: 'AI 에이전트 일일 사용 횟수 조회',
        description:
            '모든 에이전트 합산, KST 자정 기준으로 초기화된다. 실패한 턴은 사용 횟수에서 제외된다.',
    })
    @ApiCommonResponse(UsageResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getUsage(@User('sub') userId: number): Promise<UsageResDTO> {
        return UsageResDTO.from(await this.aiAgentUsageService.getSummary(userId));
    }
}
