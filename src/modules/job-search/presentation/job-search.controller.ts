import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { JobSearchSessionService } from '../application/services/job-search-session.service';
import {
    ValueBalanceAnswerReqDTO,
    ValueBalanceQuestionResDTO,
} from '../application/dtos/value-balance.dto';
import { JobSearchStatusResDTO } from '../application/dtos/job-search.dto';

@ApiTags('JobSearch')
@Controller('job-search')
export class JobSearchController {
    constructor(private readonly jobSearchSessionService: JobSearchSessionService) {}

    @Get('status')
    @ApiOperation({
        summary: '직무 찾기 실행 여부 조회',
        description: '로그인한 사용자 계정 기준으로 완료된 직무 찾기 결과가 있는지 확인합니다.',
    })
    @ApiCommonResponse(JobSearchStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getStatus(@User('sub') userId: number): Promise<JobSearchStatusResDTO> {
        const session = await this.jobSearchSessionService.getStatusForUser(userId);
        return JobSearchStatusResDTO.from(session);
    }

    @Post('values-balance/next-question')
    @Public()
    @ApiOperation({
        summary: '가치관 밸런스게임 다음 질문 조회',
        description:
            'token을 생략하면 새 세션을 시작해 첫 질문을 반환합니다. ' +
            'token과 함께 sequence·chosen을 보내면 그 답을 기록하고 다음 질문을 반환합니다. ' +
            '이미 답한 sequence를 다시 보내면(이전 질문으로 돌아가 다시 고르기) 그 지점 이후 기록은 폐기되고 이어서 다시 진행됩니다. ' +
            '5개 가치의 순위가 모두 확정되면 completed=true와 함께 순위·가중치를 반환하며, 이후에는 응답을 수정할 수 없습니다.',
    })
    @ApiCommonResponse(ValueBalanceQuestionResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.JOB_SEARCH_NOT_FOUND,
        ErrorCode.JOB_SEARCH_VALUES_ALREADY_COMPLETED,
        ErrorCode.JOB_SEARCH_INVALID_SEQUENCE,
        ErrorCode.JOB_SEARCH_INVALID_ANSWER
    )
    async getNextValueBalanceQuestion(
        @Body() body: ValueBalanceAnswerReqDTO
    ): Promise<ValueBalanceQuestionResDTO> {
        if (!body.token) {
            const progress = await this.jobSearchSessionService.startValueBalance(null);
            return ValueBalanceQuestionResDTO.from(progress);
        }

        // ValueBalanceAnswerReqDTO의 @ValidateIf가 token 존재 시 sequence/chosen을 필수로 강제한다.
        const progress = await this.jobSearchSessionService.answerValueBalance(
            body.token,
            body.sequence!,
            body.chosen!
        );
        return ValueBalanceQuestionResDTO.from(progress);
    }
}
