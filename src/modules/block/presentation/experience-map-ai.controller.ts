import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from 'src/common/decorators/user.decorator';
import { ExperienceMapTicketFacade } from '../application/facades/experience-map-ticket.facade';
import {
    IssueTicketReqDTO,
    IssueTicketResDTO,
} from '../application/dtos/experience-map-ticket.dto';

@ApiTags('ExperienceMap - AI Integration')
@Controller('api/v1/experience-map')
export class ExperienceMapAiController {
    constructor(private readonly experienceMapTicketFacade: ExperienceMapTicketFacade) {}

    @Post('ticket')
    @SkipTransform()
    @ApiOperation({
        summary: 'AI 경험 정리 세션 티켓 발급',
        description:
            '프론트가 AI 서버에 SSE로 직결하기 전에 신원을 발급받습니다. ' +
            '경험 맵이 없는 사용자는 이 호출에서 초기 데이터(26블록)가 함께 생성됩니다. ' +
            'AI 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다. ' +
            'request_id를 body로 전달하면 새로 만들지 않고 그대로 재사용합니다(재시도 턴 유지).',
    })
    @ApiResponse({ status: 200, type: IssueTicketResDTO })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async issueTicket(
        @User('sub') userId: number,
        @Body() body: IssueTicketReqDTO
    ): Promise<IssueTicketResDTO> {
        return this.experienceMapTicketFacade.issueTicket(userId, body.request_id);
    }
}
