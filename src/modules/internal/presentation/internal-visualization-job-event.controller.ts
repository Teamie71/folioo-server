import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { JobEventCallbackReqDTO } from '../application/dtos/internal-visualization-job-event.dto';
import { InternalVisualizationJobEventFacade } from '../application/facades/internal-visualization-job-event.facade';

@ApiTags('Internal - Visualizations')
@Controller('internal/visualizations')
export class InternalVisualizationJobEventController {
    constructor(private readonly internalVizJobEventFacade: InternalVisualizationJobEventFacade) {}

    @Post(':jobId/events')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '잡 이벤트 콜백 처리 (Internal)',
        description:
            'AI 워커가 파이프라인 단계 전환·완료 시 호출합니다. ' +
            'pipeline_stage_changed: pipelineStage 갱신. ' +
            'all_completed: status·pipelineStage·gcsPptxKey 갱신 후 can_export 결과를 SSE emit합니다. ' +
            '모든 콜백은 멱등(고정값 UPDATE)하므로 중복 수신해도 무해합니다.',
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
    async handleJobEvent(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() body: JobEventCallbackReqDTO
    ): Promise<void> {
        await this.internalVizJobEventFacade.handleJobEvent(jobId, body);
    }
}
