import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseFilters,
    UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiClientExceptionFilter } from 'src/common/filters/ai-client-exception.filter';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { CorrectionRagDataService } from 'src/modules/portfolio-correction/application/services/correction-rag-data.service';
import {
    InternalCorrectionResDTO,
    UpdateCompanyInsightInternalReqDTO,
    UpdateCorrectionStatusReqDTO,
} from '../application/dtos/internal-correction.dto';
import { RagDataResDTO } from '../application/dtos/internal-correction-result.dto';

type CompatFieldResult = Record<string, unknown> | undefined;

interface CompatStructuredField {
    field_name?: unknown;
    fieldName?: unknown;
    lines?: unknown;
}

interface CompatStructuredResult {
    portfolioId?: unknown;
    fields?: unknown;
    overall_summary?: unknown;
    overallSummary?: unknown;
    description?: unknown;
    responsibilities?: unknown;
    problemSolving?: unknown;
    learnings?: unknown;
    overallReview?: unknown;
}

interface CompatResultItem {
    portfolioId: number;
    data: {
        description: CompatFieldResult;
        responsibilities: CompatFieldResult;
        problemSolving: CompatFieldResult;
        learnings: CompatFieldResult;
        overallReview: CompatFieldResult;
    };
}

interface CompatSaveCorrectionResultBody {
    result?: unknown;
}

interface CompatCreateRagDataBody {
    searchQuery?: unknown;
    searchResults?: unknown;
}

@ApiExcludeController()
@Public()
@SkipTransform()
@UseFilters(AiClientExceptionFilter)
@UseGuards(InternalApiKeyGuard)
@Controller('api/corrections')
export class AiCorrectionCompatController {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionRagDataService: CorrectionRagDataService
    ) {}

    @Get(':correctionId')
    async getCorrection(
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<InternalCorrectionResDTO> {
        const payload =
            await this.portfolioCorrectionService.getInternalCorrectionDetail(correctionId);
        return InternalCorrectionResDTO.from(payload);
    }

    @Patch(':correctionId/status')
    async updateCorrectionStatus(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCorrectionStatusReqDTO
    ): Promise<{ message: string }> {
        await this.portfolioCorrectionService.updateStatusWithTransition(correctionId, body.status);
        return { message: '첨삭 상태가 변경되었습니다.' };
    }

    @Patch(':correctionId/company-insight')
    async saveCompanyInsight(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: UpdateCompanyInsightInternalReqDTO
    ): Promise<{ message: string }> {
        await this.portfolioCorrectionService.saveCompanyInsightInternal(
            correctionId,
            body.companyInsight
        );
        return { message: '기업 분석이 저장되었습니다.' };
    }

    @Patch(':correctionId/result')
    async saveCorrectionResult(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: CompatSaveCorrectionResultBody
    ): Promise<{ message: string }> {
        const normalizedItems = await this.normalizeResultItems(correctionId, body);
        await this.portfolioCorrectionService.saveCorrectionResult(correctionId, normalizedItems);
        return { message: '첨삭 결과가 저장되었습니다.' };
    }

    @Post(':correctionId/rag-data')
    async createRagData(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: CompatCreateRagDataBody
    ): Promise<{ message: string }> {
        const searchQuery = body.searchQuery;
        const searchResults = body.searchResults;

        if (typeof searchQuery !== 'string' || searchQuery.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'searchQuery must be a non-empty string.',
            });
        }

        if (
            typeof searchResults !== 'object' ||
            searchResults === null ||
            Array.isArray(searchResults)
        ) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'searchResults must be an object.',
            });
        }

        await this.correctionRagDataService.createRagData(
            correctionId,
            searchQuery,
            searchResults as Record<string, unknown>
        );
        return { message: 'RAG 데이터가 저장되었습니다.' };
    }

    @Get(':correctionId/rag-data')
    async getLatestRagData(
        @Param('correctionId', ParseIntPipe) correctionId: number
    ): Promise<RagDataResDTO | null> {
        const ragDataList = await this.correctionRagDataService.findByCorrectionId(correctionId);
        const latest = ragDataList.at(-1);
        return latest ? RagDataResDTO.from(latest, correctionId) : null;
    }

    private async normalizeResultItems(
        correctionId: number,
        body: CompatSaveCorrectionResultBody
    ): Promise<CompatResultItem[]> {
        if (!Array.isArray(body.result) || body.result.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'result must be a non-empty array.',
            });
        }

        const existingItems =
            await this.portfolioCorrectionService.getInternalCorrectionDetail(correctionId);
        const fallbackPortfolioIds = existingItems.portfolioIds;

        return body.result.map((item) => this.normalizeResultItem(item, fallbackPortfolioIds));
    }

    private normalizeResultItem(item: unknown, fallbackPortfolioIds: number[]): CompatResultItem {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'each result item must be an object.',
            });
        }

        const rawItem = item as CompatStructuredResult;
        if (this.hasDirectResultShape(rawItem)) {
            return {
                portfolioId: this.resolvePortfolioId(rawItem.portfolioId, fallbackPortfolioIds),
                data: {
                    description: this.toObjectOrNull(rawItem.description),
                    responsibilities: this.toObjectOrNull(rawItem.responsibilities),
                    problemSolving: this.toObjectOrNull(rawItem.problemSolving),
                    learnings: this.toObjectOrNull(rawItem.learnings),
                    overallReview: this.toObjectOrNull(rawItem.overallReview),
                },
            };
        }

        const fields = this.normalizeFields(rawItem.fields);
        const fieldMap = new Map(fields.map((field) => [field.name, field.value]));
        const overallSummary = rawItem.overall_summary ?? rawItem.overallSummary;

        if (typeof overallSummary !== 'string' || overallSummary.trim().length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'overall_summary must be a non-empty string.',
            });
        }

        return {
            portfolioId: this.resolvePortfolioId(rawItem.portfolioId, fallbackPortfolioIds),
            data: {
                description: fieldMap.get('description'),
                responsibilities: fieldMap.get('contributions'),
                problemSolving: fieldMap.get('achievements'),
                learnings: fieldMap.get('insights'),
                overallReview: { summary: overallSummary },
            },
        };
    }

    private hasDirectResultShape(item: CompatStructuredResult): boolean {
        return (
            item.description !== undefined ||
            item.responsibilities !== undefined ||
            item.problemSolving !== undefined ||
            item.learnings !== undefined ||
            item.overallReview !== undefined
        );
    }

    private resolvePortfolioId(rawPortfolioId: unknown, fallbackPortfolioIds: number[]): number {
        if (typeof rawPortfolioId === 'number') {
            return rawPortfolioId;
        }

        if (fallbackPortfolioIds.length !== 1) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'portfolioId is required when multiple portfolios are selected.',
            });
        }

        return fallbackPortfolioIds[0];
    }

    private normalizeFields(fields: unknown): { name: string; value: Record<string, unknown> }[] {
        if (!Array.isArray(fields) || fields.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'fields must be a non-empty array.',
            });
        }

        return fields.map((field) => {
            if (typeof field !== 'object' || field === null || Array.isArray(field)) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: 'each field must be an object.',
                });
            }

            const rawField = field as CompatStructuredField;
            const name = rawField.field_name ?? rawField.fieldName;
            if (typeof name !== 'string' || name.length === 0) {
                throw new BusinessException(ErrorCode.BAD_REQUEST, {
                    reason: 'field_name must be a non-empty string.',
                });
            }

            return {
                name,
                value: field as Record<string, unknown>,
            };
        });
    }

    private toObjectOrNull(value: unknown): Record<string, unknown> | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }

        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'result sections must be objects.',
            });
        }

        return value as Record<string, unknown>;
    }
}
