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
import Busboy from 'busboy';
import type { Request } from 'express';
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

    private static readonly MAX_PDF_SIZE = 10 * 1024 * 1024;

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
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_EXTRACT_FAILED)
    async extractPortfolios(@User('sub') userId: number, @Req() req: Request): Promise<string> {
        const { correctionId, fileBuffer, fileName } = await this.parseExtractMultipart(req);
        return this.externalPortfolioFacade.extractPortfolio(
            userId,
            correctionId,
            fileBuffer,
            fileName
        );
    }

    private async parseExtractMultipart(req: Request): Promise<{
        correctionId: number;
        fileBuffer: Buffer;
        fileName: string;
    }> {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'content-type must be multipart/form-data',
            });
        }

        return await new Promise((resolve, reject) => {
            const parser = Busboy({
                headers: req.headers,
                limits: {
                    files: 1,
                    fields: 10,
                    fileSize: ExternalPortfolioController.MAX_PDF_SIZE,
                },
            });

            const chunks: Buffer[] = [];
            let parsedCorrectionId: number | null = null;
            let parsedFileName: string | null = null;
            let hasFile = false;
            let settled = false;

            const fail = (errorCode: ErrorCode, detail: Record<string, unknown>): void => {
                if (settled) {
                    return;
                }
                settled = true;
                req.unpipe(parser);
                reject(new BusinessException(errorCode, detail));
            };

            parser.on('field', (fieldName: string, value: string) => {
                if (fieldName !== 'correctionId') {
                    return;
                }

                const correctionId = Number.parseInt(value, 10);
                if (!Number.isInteger(correctionId) || correctionId <= 0) {
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'correctionId must be a positive integer',
                    });
                    return;
                }

                parsedCorrectionId = correctionId;
            });

            parser.on('file', (fieldName, fileStream, info) => {
                if (fieldName !== 'file') {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, { reason: 'file field is required' });
                    return;
                }

                if (hasFile) {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, { reason: 'only one file is allowed' });
                    return;
                }

                if (info.mimeType !== 'application/pdf') {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'only application/pdf is allowed',
                        mimeType: info.mimeType,
                    });
                    return;
                }

                hasFile = true;
                parsedFileName = info.filename || 'upload.pdf';

                fileStream.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                fileStream.on('limit', () => {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'file size exceeds 10MB limit',
                    });
                });

                fileStream.on('error', () => {
                    fail(ErrorCode.PORTFOLIO_EXTRACT_FAILED, {
                        reason: 'failed while reading uploaded file stream',
                    });
                });
            });

            parser.on('filesLimit', () => {
                fail(ErrorCode.BAD_REQUEST, { reason: 'only one file is allowed' });
            });

            parser.on('error', () => {
                fail(ErrorCode.PORTFOLIO_EXTRACT_FAILED, {
                    reason: 'failed to parse multipart payload',
                });
            });

            parser.on('finish', () => {
                if (settled) {
                    return;
                }

                if (!hasFile || !parsedFileName) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'file is required' });
                    return;
                }

                if (parsedCorrectionId === null) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'correctionId is required' });
                    return;
                }

                const fileBuffer = Buffer.concat(chunks);
                const pdfSignature = fileBuffer.subarray(0, 4).toString();
                if (pdfSignature !== '%PDF') {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'uploaded file is not a valid PDF' });
                    return;
                }

                settled = true;
                resolve({
                    correctionId: parsedCorrectionId,
                    fileBuffer,
                    fileName: parsedFileName,
                });
            });

            req.pipe(parser);
        });
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
        return this.externalPortfolioFacade.getSelectedPortfolios(correctionId);
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
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '포트폴리오가 삭제되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.PORTFOLIO_NOT_FOUND)
    async deleteExternalPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<string> {
        await this.externalPortfolioFacade.deleteExternalPortfolio(portfolioId);
        return '포트폴리오가 삭제되었습니다.';
    }
}
