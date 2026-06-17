import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { VisualizationFacade } from '../application/facades/visualization.facade';
import {
    CreateVisualizationReqDTO,
    CreateVisualizationResDTO,
    VisualizationExportStatusResDTO,
    VisualizationSlidesResDTO,
} from '../application/dtos/visualization.dto';

@ApiTags('Visualization')
@Controller('visualizations')
export class VisualizationController {
    constructor(private readonly vizFacade: VisualizationFacade) {}

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'PPT 시각화 초기 생성 요청',
        description:
            '포트폴리오를 기반으로 PPT 시각화 작업을 시작합니다. Cloud Tasks에 작업이 enqueue되며 즉시 202 응답을 반환합니다.',
    })
    @ApiCommonResponse(CreateVisualizationResDTO, { status: HttpStatus.ACCEPTED })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.PORTFOLIO_NOT_FOUND,
        ErrorCode.CLOUD_TASKS_ENQUEUE_FAILED
    )
    async createVisualization(
        @User('sub') userId: number,
        @Body() body: CreateVisualizationReqDTO
    ): Promise<CreateVisualizationResDTO> {
        return this.vizFacade.createVisualization(userId, body.portfolioId, body.templateId);
    }

    @Get(':jobId/slides')
    @ApiOperation({
        summary: 'PPT 시각화 슬라이드 상태 조회',
        description:
            '생성한 PPT 시각화 작업의 현재 job 상태, 슬라이드 상태, 프리뷰 signed URL, 내보내기 가능 여부를 조회합니다.',
    })
    @ApiCommonResponse(VisualizationSlidesResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
    async getSlides(
        @User('sub') userId: number,
        @Param('jobId', ParseUUIDPipe) jobId: string
    ): Promise<VisualizationSlidesResDTO> {
        return this.vizFacade.getSlides(userId, jobId);
    }

    @Get(':jobId/export/status')
    @ApiOperation({
        summary: 'PPT 시각화 내보내기 상태 조회',
        description:
            '생성한 PPT 시각화 작업의 내보내기 가능 여부와 차단 중인 슬라이드 정보를 조회합니다.',
    })
    @ApiCommonResponse(VisualizationExportStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
    async getExportStatus(
        @User('sub') userId: number,
        @Param('jobId', ParseUUIDPipe) jobId: string
    ): Promise<VisualizationExportStatusResDTO> {
        return this.vizFacade.getExportStatus(userId, jobId);
    }
}
