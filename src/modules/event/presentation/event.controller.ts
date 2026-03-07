import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    ClaimEventRewardResDTO,
    EventProgressCardResDTO,
    FeedbackModalResDTO,
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
}
