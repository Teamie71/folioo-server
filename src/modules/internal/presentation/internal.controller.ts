import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalHealthResDTO } from '../application/dtos/internal-health.dto';
import { InternalApiKeyGuard } from '../infrastructure/guards/internal-api-key.guard';
import { InsightService } from 'src/modules/insight/application/services/insight.service';
import { InternalInsightDetailResDTO } from 'src/modules/internal/application/dtos/internal-insight.dto';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
    constructor(private readonly insightService: InsightService) {}

    @Get('health')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'Internal API health check',
        description: 'Verifies internal API key authentication and routing.',
    })
    @ApiCommonResponse(InternalHealthResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.INTERNAL_SERVER_ERROR)
    getHealth(): InternalHealthResDTO {
        return InternalHealthResDTO.ok();
    }

    @Get('insights/:insightId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '인사이트 로그 단건 조회 (Internal)',
        description: 'AI 서버가 insightId별 인사이트 로그 내용을 가져갈 때 사용합니다.',
    })
    @ApiCommonResponse(InternalInsightDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.LOG_NOT_FOUND)
    async getInternalInsight(
        @Param('insightId', ParseIntPipe) insightId: number
    ): Promise<InternalInsightDetailResDTO> {
        return await this.insightService.getInsightById(insightId);
    }
}
