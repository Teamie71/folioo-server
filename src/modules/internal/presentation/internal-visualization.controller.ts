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
import { SaveSlidePlanReqDTO } from '../application/dtos/internal-visualization.dto';
import { InternalVisualizationFacade } from '../application/facades/internal-visualization.facade';

@ApiTags('Internal - Visualizations')
@Controller('internal/visualizations')
export class InternalVisualizationController {
    constructor(private readonly internalVisualizationFacade: InternalVisualizationFacade) {}

    @Post(':jobId/slide-plan')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @HttpCode(HttpStatus.OK)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '슬라이드 플랜 콜백 저장 (Internal)',
        description:
            'AI 서버가 슬라이드 플랜 생성 완료 후 호출합니다. ' +
            'visualization_jobs의 total_slides·slide_plan을 갱신하고 ' +
            'visualization_slides를 일괄 INSERT합니다(중복 콜백 안전). ' +
            '완료 후 `visualizations.{jobId}` 이벤트를 emit합니다.',
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.VISUALIZATION_JOB_NOT_FOUND)
    async saveSlidePlan(
        @Param('jobId', ParseUUIDPipe) jobId: string,
        @Body() body: SaveSlidePlanReqDTO
    ): Promise<string> {
        await this.internalVisualizationFacade.saveSlidePlan(jobId, body);
        return '슬라이드 플랜이 저장되었습니다.';
    }
}
