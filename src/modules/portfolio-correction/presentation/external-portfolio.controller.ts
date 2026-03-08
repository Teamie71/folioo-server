import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Req,
    Body,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateExternalPortfolioReqDTO,
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../application/dtos/external-portfolio.dto';
import { ExternalPortfolioFacade } from '../application/facades/external-portfolio.facade';
import { ExternalPortfolioExtractRequestParserService } from './services/external-portfolio-extract-request-parser.service';

@ApiTags('Portfolio')
@Controller('external-portfolios')
export class ExternalPortfolioController {
    constructor(
        private readonly externalPortfolioFacade: ExternalPortfolioFacade,
        private readonly extractRequestParser: ExternalPortfolioExtractRequestParserService
    ) {}

    @Post('extract')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 추출',
        description: '업로드한 포트폴리오 파일에서 텍스트를 추출합니다.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                correctionId: {
                    type: 'number',
                    example: 1,
                },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['correctionId', 'file'],
        },
    })
    @ApiCommonMessageResponse('AI가 파일을 구조화하여 정리합니다.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_EXTRACT_FAILED)
    async extractPortfolios(@User('sub') userId: number, @Req() req: Request): Promise<string> {
        const { correctionId, fileBuffer, fileName } = await this.extractRequestParser.parse(req);
        return this.externalPortfolioFacade.extractPortfolio(
            userId,
            correctionId,
            fileBuffer,
            fileName
        );
    }

    @Post()
    @ApiOperation({
        summary: 'PDF 포트폴리오 활동 블록 추가',
        description:
            '텍스트 정리 블록의 활동 블록을 추가합니다. 활동 블록은 최대 5개까지 존재 가능합니다.',
    })
    @ApiBody({ type: CreateExternalPortfolioReqDTO })
    @ApiCommonResponse(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.CORRECTION_NOT_FOUND,
        ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED
    )
    async createExternalPortfolioBlock(
        @User('sub') userId: number,
        @Body() body: CreateExternalPortfolioReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        return this.externalPortfolioFacade.createExternalPortfolioBlock(body.correctionId, userId);
    }

    @Get()
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 조회',
        description: 'AI가 구조화한 포트폴리오 정보를 조회합니다.',
    })
    @ApiQuery({ name: 'correctionId', required: true, type: Number, description: '조회할 첨삭 ID' })
    @ApiCommonResponseArray(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getSelectedPortfolios(
        @User('sub') userId: number,
        @Query('correctionId', ParseIntPipe) correctionId: number
    ): Promise<StructuredPortfolioResDTO[]> {
        return this.externalPortfolioFacade.getSelectedPortfolios(correctionId, userId);
    }

    @Patch(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 수정',
        description: 'AI가 구조화한 포트폴리오 정보를 수정합니다.',
    })
    @ApiCommonResponse(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async updateExternalPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number,
        @Body() body: UpdatePortfolioBlockReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        return this.externalPortfolioFacade.updateExternalPortfolio(portfolioId, body);
    }

    @Delete(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 삭제',
        description:
            'AI가 구조화한 포트폴리오 활동을 삭제합니다. (활동 옆 마이너스 버튼을 눌러 활성화)',
    })
    @ApiCommonMessageResponse('포트폴리오가 삭제되었습니다.')
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async deleteExternalPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<string> {
        await this.externalPortfolioFacade.deleteExternalPortfolio(portfolioId);
        return '포트폴리오가 삭제되었습니다.';
    }
}
