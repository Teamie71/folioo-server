import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    PortfolioDetailResDTO,
    PortfolioListResDTO,
    UpdatePortfolioReqDTO,
} from '../application/dtos/portfolio.dto';
import { PortfolioService } from '../application/services/portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolios')
export class PortfolioController {
    constructor(private readonly portfolioService: PortfolioService) {}

    @Get()
    @ApiOperation({
        summary: '포트폴리오 목록 조회',
        description:
            '사용자의 생성 완료된 포트폴리오 목록을 조회합니다. 경험 정리가 완료되어 포트폴리오가 생성된 항목만 반환됩니다.',
    })
    @ApiCommonResponseArray(PortfolioListResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getPortfolios(@User('sub') userId: number): Promise<PortfolioListResDTO[]> {
        return this.portfolioService.getPortfolios(userId);
    }

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
}
