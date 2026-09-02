import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { OptionalAuthGuard } from '../infrastructure/guards/optional-auth.guard';
import { AssessmentService } from '../application/services/assessment.service';
import { AssessmentResultResDTO, CreateAssessmentReqDTO } from '../application/dtos/assessment.dto';

@ApiTags('Assessment')
@Controller('assessments')
export class AssessmentController {
    constructor(private readonly assessmentService: AssessmentService) {}

    @Post()
    @Public()
    @UseGuards(OptionalAuthGuard)
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 생성',
        description:
            '성향 문항 15개 응답과 확정된 가치관 순위(5개)로 분석을 실행하고 결과를 바로 반환합니다. ' +
            '로그인 상태로 요청하면 결과가 즉시 내 계정에 연결되고, 비로그인 상태면 이후 claim API로 등록할 수 있습니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.ASSESSMENT_INVALID_INPUT,
        ErrorCode.ASSESSMENT_RULESET_NOT_READY
    )
    async create(
        @User('sub') userId: number | undefined,
        @Body() body: CreateAssessmentReqDTO
    ): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.createAssessment({
            userId: userId ?? null,
            traitAnswers: body.traitAnswers,
            valueRanking: body.valueRanking,
            majorField: body.majorField ?? null,
        });
        return AssessmentResultResDTO.from(result, false);
    }

    @Get(':uuid')
    @Public()
    @UseGuards(OptionalAuthGuard)
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 결과 조회',
        description:
            'uuid만 있으면 로그인 여부와 무관하게 누구나 조회할 수 있어 공유 링크로 사용됩니다. ' +
            '비로그인 상태로 조회하면 직무 상세/기업형태 정보가 마스킹되고 locked=true가 내려갑니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(ErrorCode.ASSESSMENT_NOT_FOUND)
    async getResult(
        @Param('uuid') uuid: string,
        @User('sub') userId: number | undefined
    ): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.getResultOrThrow(uuid);
        return AssessmentResultResDTO.from(result, userId === undefined);
    }

    @Post(':uuid/claim')
    @ApiOperation({
        summary: '직무·기업형태 추천 분석 결과 소유권 등록',
        description:
            '익명으로 생성한 분석 결과를 로그인한 내 계정에 연결합니다. 이미 다른 곳에 등록된 결과는 다시 등록할 수 없습니다.',
    })
    @ApiCommonResponse(AssessmentResultResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.ASSESSMENT_NOT_FOUND,
        ErrorCode.ASSESSMENT_ALREADY_CLAIMED,
        ErrorCode.UNAUTHORIZED
    )
    async claim(
        @Param('uuid') uuid: string,
        @User('sub') userId: number
    ): Promise<AssessmentResultResDTO> {
        const result = await this.assessmentService.claim(uuid, userId);
        return AssessmentResultResDTO.from(result, false);
    }
}
