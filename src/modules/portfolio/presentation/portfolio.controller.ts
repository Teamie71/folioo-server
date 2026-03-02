import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    ExportPortfolioResDTO,
    PortfolioDetailResDTO,
    UpdatePortfolioReqDTO,
} from '../application/dtos/portfolio.dto';
import { PortfolioService } from '../application/services/portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolios')
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) {}

    @Get(':portfolioId')
    @ApiOperation({
        summary: '개별 포트폴리오 조회',
        description: '경험 정리가 완료된 포트폴리오를 조회합니다.',
    })
    @ApiCommonResponse(PortfolioDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async getPortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<PortfolioDetailResDTO> {
        return this.portfolioService.getPortfolio(portfolioId, userId);
    }

    @Patch(':portfolioId')
    @ApiOperation({
        summary: '개별 포트폴리오 수정',
        description: '경험 정리가 완료된 포트폴리오의 내용을 수정합니다.',
    })
    @ApiCommonResponse(PortfolioDetailResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    updatePortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number,
        @Body() body: UpdatePortfolioReqDTO
    ): Promise<PortfolioDetailResDTO> {
        return this.portfolioService.updatePortfolio(portfolioId, userId, body);
    }

    @Delete(':portfolioId')
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
    async deletePortfolio(
        @User('sub') userId: number,
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<string> {
        await this.portfolioService.deletePortfolio(portfolioId, userId);
        return '포트폴리오가 성공적으로 삭제되었습니다.';
    }

    @Post(':portfolioId/export')
    @ApiOperation({
        summary: '포트폴리오 내보내기',
        description: '경험 정리가 완료된 포트폴리오를 pdf로 내보냅니다.',
    })
    @ApiCommonResponse(ExportPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    exportPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): ExportPortfolioResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, portfolioId);
    }
}
