import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from 'src/common/decorators/user.decorator';
import { ExperienceMapTicketFacade } from '../application/facades/experience-map-ticket.facade';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    IssueTicketReqDTO,
    IssueTicketResDTO,
} from '../application/dtos/experience-map-ticket.dto';
import { RevertReqDTO, RevertResDTO } from '../application/dtos/experience-map-revert.dto';

@ApiTags('ExperienceMap - AI Integration')
@Controller('api/v1/experience-map')
export class ExperienceMapAiController {
    constructor(
        private readonly experienceMapTicketFacade: ExperienceMapTicketFacade,
        private readonly experienceMapFacade: ExperienceMapFacade
    ) {}

    @Post('ticket')
    @ApiOperation({
        summary: 'AI 경험 정리 세션 티켓 발급',
        description:
            '프론트가 AI 서버에 SSE로 직결하기 전에 신원을 발급받습니다. ' +
            '경험 맵이 없는 사용자는 이 호출에서 초기 데이터(26블록)가 함께 생성됩니다. ' +
            'AI 세션이 없으면 AI 서버 POST /sessions를 호출해 생성합니다. ' +
            'request_id를 body로 전달하면 새로 만들지 않고 그대로 재사용합니다(재시도 턴 유지).',
    })
    @ApiCommonResponse(IssueTicketResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async issueTicket(
        @User('sub') userId: number,
        @Body() body: IssueTicketReqDTO
    ): Promise<IssueTicketResDTO> {
        return this.experienceMapTicketFacade.issueTicket(userId, body.request_id);
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
}
