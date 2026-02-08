import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CorrectionResDTO,
    CorrectionStatusResDTO,
    CreateCorrectionReqDTO,
    MapCorrectionWithPortfoliosReqDTO,
    UpdateCorrectionTitleReqDTO,
} from '../application/dtos/portfolio-correction.dto';
import { PortfolioCorrectionFacade } from '../application/facades/portfolio-correction.facade';
import { PortfolioCorrectionService } from '../application/services/portfolio-correction.service';
import {
    UpdateCompanyInsightReqDTO,
    UpdateCompanyInsightResDTO,
} from '../application/dtos/company-insight.dto';
import {
    CorrectionItemResDTO,
    CorrectionResultResDTO,
} from '../application/dtos/correction-result.dto';

@ApiTags('Portfolio-Correction')
@Controller('portfolio-corrections')
export class PortfolioCorrectionController {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly portfolioCorrectionFacade: PortfolioCorrectionFacade
    ) {}

    @Get()
    @ApiOperation({
        summary: '첨삭 목록 조회',
        description:
            '포트폴리오 첨삭 목록을 조회합니다. 검색어를 입력하면 제목에 키워드를 포함하는 목록만 조회됩니다.',
    })
    @ApiQuery({ name: 'keyword', required: false })
    @ApiCommonResponseArray(CorrectionResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_MAX_LIMIT)
    async getCorrections(
        @User('sub') userId: number,
        @Query('keyword') keyword?: string
    ): Promise<CorrectionResDTO[]> {
        return this.portfolioCorrectionService.getCorrections(userId, keyword);
    }

    @Post()
    @ApiOperation({
        summary: '첨삭 의뢰하기',
        description: '포트폴리오 첨삭을 시작합니다. 30크레딧이 차감됩니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'AI 첨삭이 의뢰되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.INSUFFICIENT_CREDITS)
    async createCorrection(
        @User('sub') userId: number,
        @Body() body: CreateCorrectionReqDTO
    ): Promise<string> {
        await this.portfolioCorrectionFacade.requestCorrection(userId, body);
        return 'AI 첨삭이 의뢰되었습니다.';
    }

    @Get(':correctionId/status')
    @ApiOperation({
        summary: '개별 첨삭 상태 조회',
        description: '특정 AI 첨삭의 결과를 조회합니다.',
    })
    @ApiCommonResponse(CorrectionStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    getCorrectionStatus(@Param('correctionId') correctionId: number): CorrectionStatusResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Post(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 생성',
        description: '특정 AI 첨삭의 기업 분석 정보 생성을 시작합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '기업 분석 정보 생성이 시작되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    createCompanyInsight(@Param('correctionId') correctionId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Get(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 조회',
        description: '특정 AI 첨삭의 기업 분석 정보를 조회합니다.',
    })
    @ApiCommonResponse(UpdateCompanyInsightResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    getCompanyInsight(@Param('correctionId') correctionId: number): UpdateCompanyInsightResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Patch(':correctionId/company-insight')
    @ApiOperation({
        summary: '기업 분석 정보 수정',
        description:
            'AI가 생성한 기업 분석 정보를 사용자가 수정합니다. 또는 강조 포인트를 추가합니다.',
    })
    @ApiCommonResponse(UpdateCompanyInsightResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    updateCompanyInsight(
        @Param('correctionId') correctionId: number,
        @Body() body: UpdateCompanyInsightReqDTO
    ): UpdateCompanyInsightResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { correctionId, body });
    }

    @Post(':correctionId/regenerate-insight')
    @ApiOperation({
        summary: '기업 분석 정보 재생성',
        description: '특정 AI 첨삭의 기업 분석 정보를 재생성합니다. 3크레딧이 차감됩니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '3크레딧을 차감하여 기업 분석 정보를 재생성합니다.',
            },
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.INSUFFICIENT_CREDITS
    )
    reCreateCompanyInsight(@Param('correctionId') correctionId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Post(':correctionId/select')
    @ApiOperation({
        summary: '포트폴리오 선택',
        description: '첨삭을 진행할 포트폴리오를 선택합니다.',
    })
    @ApiCommonResponseArray(CorrectionItemResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED
    )
    mapCorrectionWithPortfolios(
        @Param('correctionId') correctionId: number,
        @Body() body: MapCorrectionWithPortfoliosReqDTO
    ): CorrectionItemResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { correctionId, body });
    }

    @Post(':correctionId/generate')
    @ApiOperation({
        summary: 'AI 첨삭 생성',
        description: '선택한 포트폴리오에 대해 첨삭을 생성합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'AI 포트폴리오 첨삭 결과를 생성합니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    createCorrectionByAI(@Param('correctionId') correctionId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Get(':correctionId')
    @ApiOperation({
        summary: '개별 첨삭 조회',
        description: '특정 AI 첨삭의 결과를 조회합니다.',
    })
    @ApiCommonResponse(CorrectionResultResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    getCorrection(@Param('correctionId') correctionId: number): CorrectionResultResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }

    @Patch(':correctionId')
    @ApiOperation({
        summary: '개별 첨삭 수정',
        description: '특정 AI 첨삭의 제목을 수정합니다.',
    })
    @ApiCommonResponse(CorrectionResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    updateCorrectionTitle(
        @Param('correctionId') correctionId: number,
        @Body() body: UpdateCorrectionTitleReqDTO
    ): CorrectionResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { correctionId, body });
    }

    @Delete(':correctionId')
    @ApiOperation({
        summary: '첨삭 삭제하기',
        description: 'AI 첨삭 내역을 삭제합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '첨삭이 삭제되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    deleteCorrection(@Param('correctionId') correctionId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, correctionId);
    }
}
