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
import { SlideEventCallbackReqDTO } from '../application/dtos/internal-visualization-slide-event.dto';
import { InternalVisualizationSlideEventFacade } from '../application/facades/internal-visualization-slide-event.facade';

@ApiTags('Internal - Visualizations')
@Controller('internal/visualizations')
export class InternalVisualizationSlideEventController {
    constructor(
        private readonly internalVizSlideEventFacade: InternalVisualizationSlideEventFacade
    ) {}

    @Post(':jobId/slides/:slideId/events')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @HttpCode(HttpStatus.OK)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '슬라이드 이벤트 콜백 처리 (Internal)',
        description:
            'AI 워커가 슬라이드 처리 단계마다 호출합니다. ' +
            'visualization_slides 상태·fills·preview 키를 갱신합니다. ' +
            'preview_ready·regenerated로 슬라이드가 completed가 되면 job 자동 finalize를 수행합니다. ' +
            '모든 콜백은 멱등(고정값 UPDATE)하므로 중복 수신해도 무해합니다.',
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.VISUALIZATION_JOB_NOT_FOUND,
        ErrorCode.VISUALIZATION_SLIDE_NOT_FOUND
    )
    async handleSlideEvent(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Param('slideId', ParseUUIDPipe) slideId: string,
        @Body() body: SlideEventCallbackReqDTO
    ): Promise<string> {
        await this.internalVizSlideEventFacade.handleSlideEvent(jobId, slideId, body);
        return '슬라이드 이벤트가 처리되었습니다.';
    }
}
