import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalApiKeyGuard } from 'src/modules/internal/infrastructure/guards/internal-api-key.guard';
import {
    ClaimEventRewardResDTO,
    EventProgressCardResDTO,
    FeedbackModalResDTO,
    GrantFeedbackRewardReqDTO,
    GrantFeedbackRewardResDTO,
} from '../application/dtos/event.dto';
import { EventRewardFacade } from '../application/facades/event-reward.facade';

@ApiTags('Event')
@Controller('events')
export class EventController {
    constructor(private readonly eventRewardFacade: EventRewardFacade) {}

    @Get(':eventCode/feedback-modal')
    @ApiOperation({
        summary: '이벤트 피드백 모달 상태 조회',
        description: '내 보상 상태에 따라 피드백 모달 좌/우 버전 표시용 데이터를 반환합니다.',
    })
    @ApiCommonResponse(FeedbackModalResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.EVENT_NOT_FOUND)
    async getFeedbackModal(
        @User('sub') userId: number,
        @Param('eventCode') eventCode: string
    ): Promise<FeedbackModalResDTO> {
        return this.eventRewardFacade.getFeedbackModal(userId, eventCode);
    }

    @Get(':eventCode/progress-card')
    @ApiOperation({
        summary: '이벤트 진행 카드 조회',
        description:
            '인사이트 챌린지 등 진행형 이벤트의 동적 문구/진행도/CTA 노출을 위한 데이터를 반환합니다.',
    })
    @ApiCommonResponse(EventProgressCardResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.EVENT_NOT_FOUND)
    async getProgressCard(
        @User('sub') userId: number,
        @Param('eventCode') eventCode: string
    ): Promise<EventProgressCardResDTO> {
        return this.eventRewardFacade.getProgressCard(userId, eventCode);
    }

    @Post(':eventCode/reward-claim')
    @ApiOperation({
        summary: '이벤트 보상 수령',
        description:
            '챌린지 완료 사용자가 이벤트 보상을 직접 수령합니다. 이미 수령했거나 조건 미달성인 경우 실패합니다.',
    })
    @ApiCommonResponse(ClaimEventRewardResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.EVENT_REWARD_NOT_CLAIMABLE,
        ErrorCode.EVENT_REWARD_ALREADY_GRANTED
    )
    async claimEventReward(
        @User('sub') userId: number,
        @Param('eventCode') eventCode: string
    ): Promise<ClaimEventRewardResDTO> {
        return this.eventRewardFacade.claimEventReward(userId, eventCode);
    }

    @Post('admin/:eventCode/feedback-rewards/grants')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiOperation({
        summary: '[Deprecated] 피드백 이벤트 수동 보상 지급 (전화번호 기반)',
        description:
            '운영/PM이 외부 피드백 제출건 확인 후 전화번호 기준으로 보상을 수동 지급합니다. Admin 대시보드(/admin/event-rewards) 사용을 권장합니다.',
    })
    @ApiBody({ type: GrantFeedbackRewardReqDTO })
    @ApiCommonResponse(GrantFeedbackRewardResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED,
        ErrorCode.EVENT_REWARD_ALREADY_GRANTED,
        ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED,
        ErrorCode.USER_NOT_FOUND
    )
    async grantFeedbackRewardByPhone(
        @Param('eventCode') eventCode: string,
        @Body() body: GrantFeedbackRewardReqDTO
    ): Promise<GrantFeedbackRewardResDTO> {
        return this.eventRewardFacade.grantFeedbackRewardByPhone(eventCode, body);
    }
}
