import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateExperienceReqDTO,
    ExperienceResDTO,
    ExperienceStateResDTO,
} from '../application/dtos/experience.dto';
import { ExperienceFacade } from '../application/facades/experience.facade';

@ApiTags('Experience')
@Controller('experiences')
export class ExperienceController {
    constructor(private readonly experienceFacade: ExperienceFacade) {}

    @Post()
    @ApiOperation({
        summary: '새로운 경험 정리 시작하기',
        description:
            '새로운 경험 정리를 생성하고, AI와의 대화를 시작합니다. 30크레딧을 사용합니다. 인당 최대 15개의 경험을 저장할 수 있습니다.',
    })
    @ApiCommonResponse(ExperienceResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_MAX_LIMIT,
        ErrorCode.DUPLICATE_EXPERIENCE_NAME,
        ErrorCode.INSUFFICIENT_CREDITS
    )
    async createExperience(
        @User('sub') userId: number,
        @Body() body: CreateExperienceReqDTO
    ): Promise<ExperienceResDTO> {
        return this.experienceFacade.createExperience(userId, body.name, body.hopeJob);
    }

    @Get()
    @ApiOperation({
        summary: '경험 정리 목록 조회',
        description:
            '사용자가 생성한 경험 정리 목록을 조회합니다. 검색어를 입력하면 제목에 키워드를 포함하는 목록만 조회됩니다.',
    })
    @ApiQuery({ name: 'keyword', required: false })
    @ApiCommonResponseArray(ExperienceResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getExperiences(@Query('keyword') keyword?: string): ExperienceResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, keyword);
    }

    @Get(':experienceId')
    @ApiOperation({
        summary: '경험 정리 개별 조회',
        description:
            '경험 정리를 개별 조회합니다. 현재 경험 정리의 상태를 반환합니다. (대화 중/완료)',
    })
    @ApiCommonResponse(ExperienceStateResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getExperience(): ExperienceStateResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }
}
