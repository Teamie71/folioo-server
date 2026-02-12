import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseFilePipeBuilder,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonResponse,
    ApiCommonResponseArray,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateExternalPortfolioReqDTO,
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../application/dtos/external-portfolio.dto';
import { ExternalPortfolioFacade } from '../application/facades/external-portfolio.facade';

@ApiTags('Portfolio')
@Controller('external-portfolios')
export class ExternalPortfolioController {
    constructor(private readonly externalPortfolioFacade: ExternalPortfolioFacade) {}

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
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'AI가 파일을 구조화하여 정리합니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @UseInterceptors(FileInterceptor('file'))
    extractPortfolios(
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: 'pdf',
                })
                .addMaxSizeValidator({
                    maxSize: 1024 * 1024 * 10,
                })
                .build({
                    fileIsRequired: true,
                })
        )
        file: Express.Multer.File
    ): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, file);
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
    @ApiQuery({ name: 'correctionId', required: true, type: Number })
    @ApiCommonResponseArray(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.CORRECTION_NOT_FOUND)
    async getExternalPortfolios(
        @Query('correctionId', ParseIntPipe) correctionId: number
    ): Promise<StructuredPortfolioResDTO[]> {
        return this.externalPortfolioFacade.getExternalPortfolios(correctionId);
    }

    @Patch(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 수정',
        description: 'AI가 구조화한 포트폴리오 정보를 수정합니다.',
    })
    @ApiCommonResponseArray(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    updateExternalPortfolios(
        @Param('portfolioId') portfolioId: number,
        @Body() body: UpdatePortfolioBlockReqDTO
    ): StructuredPortfolioResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, { portfolioId, body });
    }

    @Delete(':portfolioId')
    @ApiOperation({
        summary: 'PDF 포트폴리오 텍스트 정리 결과 삭제',
        description:
            'AI가 구조화한 포트폴리오 활동을 삭제합니다. (활동 옆 마이너스 버튼을 눌러 활성화)',
    })
    @ApiCommonResponseArray(StructuredPortfolioResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    deleteExternalPortfolios(
        @Param('portfolioId') portfolioId: number
    ): StructuredPortfolioResDTO[] {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, portfolioId);
    }
}
