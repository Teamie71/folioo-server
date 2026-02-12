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
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateInsightLogReqDTO,
    DeletedInsightLogResDTO,
    InsightLogResDTO,
    UpdateInsightReqDTO,
} from '../application/dtos/insight-log.dto';
import { ActivityNameReqDTO, ActivityNameResDTO } from '../application/dtos/activity-tag.dto';
import { User } from 'src/common/decorators/user.decorator';
import { InsightService } from '../application/services/insight.service';

@ApiTags('Insight')
@Controller('insights')
export class InsightController {
    constructor(private readonly insightService: InsightService) {}

    @Post()
    @ApiOperation({
        summary: '로그 생성 및 임베딩 저장',
        description:
            '인사이트 로그를 생성하고, 텍스트를 임베딩으로 변환하여 메타데이터를 벡터DB에 저장합니다.',
    })
    @ApiCommonResponse(InsightLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.DUPLICATE_LOG_NAME, ErrorCode.UNAUTHORIZED)
    createLog(@Body() body: CreateInsightLogReqDTO): InsightLogResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

    @Get()
    @ApiOperation({
        summary: '로그 목록 조회',
        description: '사용자가 생성한 인사이트 로그 목록을 조회합니다.',
    })
    @ApiCommonResponseArray(InsightLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getLogs(): InsightLogResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Patch(':insightId')
    @ApiOperation({
        summary: '인사이트 로그 수정',
        description:
            '인사이트 로그를 수정하고, 기존 벡터를 삭제 후 메타데이터를 벡터DB에 다시 저장합니다.',
    })
    @ApiCommonResponse(InsightLogResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.LOG_NOT_FOUND,
        ErrorCode.NOT_LOG_OWNER,
        ErrorCode.DUPLICATE_LOG_NAME
    )
    async updateLog(
        @Param('insightId', ParseIntPipe) insightId: number,
        @Body() body: UpdateInsightReqDTO,
        @User('sub') userId: number
    ): Promise<InsightLogResDTO> {
        return await this.insightService.updateInsight(userId, insightId, body);
    }

    @Delete(':insightId')
    @ApiOperation({
        summary: '인사이트 로그 삭제',
        description: '인사이트 로그 및 메타데이터를 삭제합니다.',
    })
    @ApiCommonResponse(DeletedInsightLogResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.LOG_NOT_FOUND,
        ErrorCode.NOT_LOG_OWNER
    )
    async deleteLog(
        @Param('insightId', ParseIntPipe) insightId: number,
        @User('sub') userId: number
    ): Promise<DeletedInsightLogResDTO> {
        return DeletedInsightLogResDTO.from(
            await this.insightService.deleteInsight(userId, insightId)
        );
    }

    @Get('search')
    @ApiOperation({
        summary: '인사이트 로그 유사도 검색',
        description: '키워드를 통해 인사이트 로그를 검색합니다.',
    })
    @ApiQuery({ name: 'keyword', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'activityName', required: false })
    @ApiCommonResponseArray(InsightLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    searchVector(
        @Query('keyword') keyword?: string,
        @Query('category') category?: string,
        @Query('activityName') activityName?: string
    ): InsightLogResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { keyword, category, activityName });
    }

    @Post('tags')
    @ApiOperation({
        summary: '활동 분류 태그 생성',
        description: '활동명을 생성합니다. 인당 10개 제한이 있으며, 활동명은 unique합니다.',
    })
    @ApiCommonResponse(ActivityNameResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.DUPLICATE_ACTIVITY_NAME,
        ErrorCode.FULL_ACTIVITY_NAME
    )
    createActivityTag(@Body() body: ActivityNameReqDTO): ActivityNameResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

    @Get('tags')
    @ApiOperation({
        summary: '활동 분류 태그 목록 조회',
        description: '활동 분류 태그 목록을 조회합니다. 인당 10개 제한이 있습니다.',
    })
    @ApiCommonResponseArray(ActivityNameResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getActivityTags(): ActivityNameResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Delete('tags/:tagId')
    @ApiOperation({
        summary: '활동 분류 태그 삭제',
        description:
            '활동 분류 태그를 삭제합니다. 태그가 연결되어있던 인사이트 로그는 자동적으로 미분류 상태가 됩니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '활동 분류 태그가 성공적으로 삭제되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.ACTIVITY_NOT_FOUND)
    deleteActivityTag(@Param('tagId') tagId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, tagId);
    }
}
