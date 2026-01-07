import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    ExportPortfolioResDTO,
    PortfolioResDTO,
    UpdatePortfolioReqDTO,
} from '../application/dtos/portfolio.dto';

@ApiTags('Portfolio')
@Controller('portfolios')
export class PortfolioController {
    @ApiOperation({
        summary: '개별 포트폴리오 조회',
        description: '경험 정리가 완료된 포트폴리오를 조회합니다.',
    })
    @ApiCommonResponse(PortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    @Get(':portfolioId')
    getPortfolio(@Param('portfolioId') portfolioId: number): PortfolioResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, portfolioId);
    }

    @ApiOperation({
        summary: '개별 포트폴리오 수정',
        description: '경험 정리가 완료된 포트폴리오의 내용을 수정합니다.',
    })
    @ApiCommonResponse(PortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    @Patch(':portfolioId')
    updatePortfolio(
        @Param('portfolioId') portfolioId: number,
        @Body() body: UpdatePortfolioReqDTO
    ): PortfolioResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { portfolioId, body });
    }

    @ApiOperation({
        summary: '개별 포트폴리오 삭제',
        description: '경험 정리가 완료된 포트폴리오의 내용을 삭제합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '포트폴리오가 성공적으로 삭제되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    @Delete(':portfolioId')
    deletePortfolio(@Param('portfolioId') portfolioId: number): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, portfolioId);
    }

    @ApiOperation({
        summary: '포트폴리오 내보내기',
        description: '경험 정리가 완료된 포트폴리오를 pdf로 내보냅니다.',
    })
    @ApiCommonResponse(ExportPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    @Post(':portfolioId/export')
    exportPortfolio(@Param('portfolioId') portfolioId: number): ExportPortfolioResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, portfolioId);
    }
}
