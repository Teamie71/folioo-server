import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalHealthResDTO } from '../application/dtos/internal-health.dto';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { InsightService } from 'src/modules/insight/application/services/insight.service';
import { InternalInsightDetailResDTO } from '../application/dtos/internal-insight.dto';
import {
    InsightDetailPayload,
    InsightSimilarityPayload,
} from 'src/modules/insight/application/dtos/insight-internal.dto';
import {
    InternalInsightSearchQueryDTO,
    InternalInsightSearchResDTO,
} from '../application/dtos/internal-insight-search.dto';
import {
    InternalPortfolioDetailResDTO,
    UpdatePortfolioResultReqDTO,
} from '../application/dtos/internal-portfolio.dto';
import { InternalPortfolioFacade } from '../application/facades/internal-portfolio.facade';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
    constructor(
        private readonly insightService: InsightService,
        private readonly internalPortfolioFacade: InternalPortfolioFacade
    ) {}

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

    @Get('insights/search')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '인사이트 로그 유사도 검색 (Internal)',
        description: 'AI 서버가 키워드 기반으로 사용자 인사이트를 벡터 검색합니다.',
    })
    @ApiCommonResponse(InternalInsightSearchResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async searchInternalInsights(
        @Query() query: InternalInsightSearchQueryDTO
    ): Promise<InternalInsightSearchResDTO> {
        const similarityThreshold = query.threshold ?? 0.6;
        const distanceThreshold = 1 - similarityThreshold;
        const limit = query.topK;
        const results: InsightSimilarityPayload[] =
            await this.insightService.searchInsightWithSimilarity(
                query.userId,
                query.keyword,
                distanceThreshold,
                limit
            );
        const mapped = results.map((result) => InternalInsightDetailResDTO.fromSimilarity(result));
        return InternalInsightSearchResDTO.from(mapped);
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
        const payload: InsightDetailPayload = await this.insightService.getInsightById(insightId);
        return InternalInsightDetailResDTO.from(payload);
    }

    @Get('portfolios/:portfolioId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '포트폴리오 원문 조회 (Internal)',
        description: 'AI 서버가 첨삭 생성 시 원문 조회를 위해 사용합니다.',
    })
    @ApiCommonResponse(InternalPortfolioDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async getInternalPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<InternalPortfolioDetailResDTO> {
        return this.internalPortfolioFacade.getPortfolioDetail(portfolioId);
    }

    @Patch('portfolios/:portfolioId')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: '포트폴리오 AI 생성 결과 저장 (Internal)',
        description: 'AI 서버의 생성 결과를 저장하기 위한 콜백 API',
    })
    @ApiCommonMessageResponse('portfolio generation result saved')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async updateInternalPortfolio(
        @Body() body: UpdatePortfolioResultReqDTO,
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<string> {
        await this.internalPortfolioFacade.savePortfolioResult(portfolioId, body);
        return 'portfolio generation result saved';
    }
}
