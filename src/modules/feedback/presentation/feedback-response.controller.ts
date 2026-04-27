import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SubmitFeedbackResponseReqDTO } from '../application/dtos/submit-feedback-response.req.dto';
import { SubmitFeedbackFacade } from '../application/facades/submit-feedback.facade';

@ApiTags('Feedback')
@Controller('feedbacks')
export class FeedbackResponseController {
    constructor(private readonly submitFeedbackFacade: SubmitFeedbackFacade) {}

    @Post('feedback-responses')
    @ApiOperation({
        summary: '피드백 제출',
        description:
            '참여 행이 없으면 생성 후 제출합니다. 이벤트에 지급할 보상이 있는 경우, 해당 참여 건의 직전 피드백 제출 시각 기준 보상 쿨다운이 끝나기 전에는 제출 전체가 거절됩니다. 보상이 없는 이벤트는 쿨다운 없이 제출할 수 있습니다.',
    })
    @ApiCommonResponse(null, {
        exampleResult: {
            success: true,
            message: '피드백이 성공적으로 제출되었습니다.',
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH,
        ErrorCode.FEEDBACK_REWARD_COOLDOWN_ACTIVE
    )
    async submitFeedbackResponse(
        @User('sub') userId: number,
        @Body() body: SubmitFeedbackResponseReqDTO
    ): Promise<{ success: true; message: string }> {
        await this.submitFeedbackFacade.submit(userId, body);
        return {
            success: true,
            message: '피드백이 성공적으로 제출되었습니다.',
        };
    }
}
