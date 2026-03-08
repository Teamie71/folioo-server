import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateExperienceReqDTO,
    ExperienceResDTO,
    ExperienceStateResDTO,
    UpdateExperienceReqDTO,
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
            '새로운 경험 정리를 생성하고, AI와의 대화를 시작합니다. 경험 정리 티켓 1장을 사용합니다. 인당 최대 15개의 경험을 저장할 수 있습니다.',
    })
    @ApiCommonResponse(ExperienceResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_MAX_LIMIT,
        ErrorCode.INSUFFICIENT_TICKETS
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
    async getExperiences(
        @User('sub') userId: number,
        @Query('keyword') keyword?: string
    ): Promise<ExperienceResDTO[]> {
        return this.experienceFacade.getExperiences(userId, keyword);
    }

    @Get(':experienceId')
    @ApiOperation({
        summary: '경험 정리 개별 조회',
        description:
            '경험 정리를 개별 조회합니다. 현재 경험 정리의 상태를 반환합니다. (대화 중/완료)',
    })
    @ApiCommonResponse(ExperienceStateResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.EXPERIENCE_NOT_FOUND)
    async getExperience(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number
    ): Promise<ExperienceStateResDTO> {
        return this.experienceFacade.getExperience(experienceId, userId);
    }

    @Patch(':experienceId')
    @ApiOperation({
        summary: '경험 정리 수정',
        description: '경험 정리의 제목 또는 희망 직무를 수정합니다.',
    })
    @ApiCommonResponse(ExperienceResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.EXPERIENCE_NOT_FOUND)
    async updateExperience(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number,
        @Body() body: UpdateExperienceReqDTO
    ): Promise<ExperienceResDTO> {
        return this.experienceFacade.updateExperience(experienceId, userId, body);
    }

    @Delete(':experienceId')
    @ApiOperation({
        summary: '경험 정리 삭제',
        description:
            '경험 정리를 삭제합니다. 연결된 포트폴리오가 있으면 함께 삭제됩니다. 연결된 첨삭이 존재하는 경우 삭제할 수 없습니다.',
    })
    @ApiCommonMessageResponse('경험 정리가 성공적으로 삭제되었습니다.')
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.EXPERIENCE_NOT_FOUND,
        ErrorCode.EXPERIENCE_HAS_CORRECTIONS
    )
    async deleteExperience(
        @User('sub') userId: number,
        @Param('experienceId', ParseIntPipe) experienceId: number
    ): Promise<string> {
        await this.experienceFacade.deleteExperience(experienceId, userId);
        return '경험 정리가 성공적으로 삭제되었습니다.';
    }
}
