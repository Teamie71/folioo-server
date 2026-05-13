import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SubmitFeedbackResponseReqDTO } from '../application/dtos/submit-feedback-response.req.dto';
import { SubmitFeedbackResponseResDTO } from '../application/dtos/submit-feedback-response.res.dto';
import { SubmitFeedbackFacade } from '../application/facades/submit-feedback.facade';

@ApiTags('Feedback')
@Controller('feedbacks')
export class FeedbackResponseController {
    constructor(private readonly submitFeedbackFacade: SubmitFeedbackFacade) {}

    @Post('feedback-responses')
    @ApiOperation({
        summary: '피드백 제출',
        description:
            '참여 행이 없으면 생성 후 제출합니다. 제출은 항상 허용됩니다. 이벤트에 지급할 보상이 있는 경우, 쿨다운 기간 내에 재제출하면 보상은 지급되지 않고 rewardGranted: false로 응답합니다.',
    })
    @ApiCommonResponse(SubmitFeedbackResponseResDTO, {
        exampleResult: {
            rewardGranted: true,
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.FEEDBACK_FORM_EVENT_MISMATCH
    )
    async submitFeedbackResponse(
        @User('sub') userId: number,
        @Body() body: SubmitFeedbackResponseReqDTO
    ): Promise<SubmitFeedbackResponseResDTO> {
        return this.submitFeedbackFacade.submit(userId, body);
    }
}
