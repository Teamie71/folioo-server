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
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateInsightLogReqDTO,
    DeletedInsightLogResDTO,
    InsightLogResDTO,
    QueryLogsDTO,
    SummaryLogResDTO,
    UpdateInsightReqDTO,
} from '../application/dtos/insight-log.dto';
import { ActivityNameReqDTO, ActivityNameResDTO } from '../application/dtos/activity-tag.dto';
import { User } from 'src/common/decorators/user.decorator';
import { InsightService } from '../application/services/insight.service';
import { ActivityService } from '../application/services/activity.service';
import { InsightFacade } from '../application/facades/insight.facade';

@ApiTags('Insight')
@Controller('insights')
export class InsightController {
    constructor(
        private readonly insightFacade: InsightFacade,
        private readonly insightService: InsightService,
        private readonly activityService: ActivityService
    ) {}

    @Post()
    @ApiOperation({
        summary: '로그 생성 및 임베딩 저장',
        description:
            '인사이트 로그를 생성하고, 텍스트를 임베딩으로 변환하여 메타데이터를 벡터DB에 저장합니다.',
    })
    @ApiCommonResponse(InsightLogResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.DUPLICATE_LOG_NAME,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.LOG_MAX_LIMIT
    )
    async createLog(
        @Body() body: CreateInsightLogReqDTO,
        @User('sub') userId: number
    ): Promise<InsightLogResDTO> {
        return this.insightFacade.createInsight(userId, body);
    }

    @Get()
    @ApiOperation({
        summary: '로그 목록 조회',
        description: '사용자가 생성한 인사이트 로그 목록을 조회합니다.',
    })
    @ApiCommonResponseArray(InsightLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getLogs(
        @User('sub') userId: number,
        @Query() query: QueryLogsDTO
    ): Promise<InsightLogResDTO[]> {
        return await this.insightService.getInsightLogs(userId, query);
    }

    @Get('summary')
    @ApiOperation({
        summary: '챗봇 멘션용 간소화 인사이트 목록 조회',
        description: '사용자가 생성한 인사이트 로그 목록을 카테고리별로 간소화하여 조회합니다.',
    })
    @ApiCommonResponseArray(SummaryLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getSimpleLogs(@User('sub') userId: number): Promise<SummaryLogResDTO[]> {
        return await this.insightService.getSummaryInsights(userId);
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
    @ApiQuery({ name: 'keyword', required: true })
    @ApiQuery({
        name: 'threshold',
        required: false,
        description: '유사도 거리 임계값 (기본 0.7, 작을수록 일치도 높음)',
    })
    @ApiCommonResponseArray(InsightLogResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async searchVector(
        @User('sub') userId: number,
        @Query('keyword') keyword: string,
        @Query('threshold') threshold?: number
    ): Promise<InsightLogResDTO[]> {
        const targetThreshold = threshold ?? 0.7;
        return await this.insightService.searchInsight(userId, keyword, targetThreshold);
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
        ErrorCode.FULL_ACTIVITY_TAG
    )
    async createActivityTag(
        @User('sub') userId: number,
        @Body() body: ActivityNameReqDTO
    ): Promise<ActivityNameResDTO> {
        return await this.activityService.createActivity(userId, body.name);
    }

    @Get('tags')
    @ApiOperation({
        summary: '활동 분류 태그 목록 조회',
        description: '활동 분류 태그 목록을 조회합니다. 인당 10개 제한이 있습니다.',
    })
    @ApiCommonResponseArray(ActivityNameResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getActivityTags(@User('sub') userId: number): Promise<ActivityNameResDTO[]> {
        return await this.activityService.getTagsByUser(userId);
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
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.NOT_ACTIVITY_TAG_OWNER,
        ErrorCode.ACTIVITY_NOT_FOUND
    )
    async deleteActivityTag(
        @User('sub') userId: number,
        @Param('tagId', ParseIntPipe) tagId: number
    ): Promise<string> {
        await this.activityService.deleteActivity(userId, tagId);
        return '활동 분류 태그가 성공적으로 삭제되었습니다.';
    }
}
