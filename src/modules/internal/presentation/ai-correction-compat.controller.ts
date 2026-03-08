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
import { AiClientExceptionFilter } from 'src/common/filters/ai-client-exception.filter';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { CorrectionRagDataService } from 'src/modules/portfolio-correction/application/services/correction-rag-data.service';
import { AiCorrectionCompatService } from '../application/services/ai-correction-compat.service';
import type {
    CompatCreateRagDataBody,
    CompatSaveCorrectionResultBody,
} from '../application/services/ai-correction-compat.service';
import {
    InternalCorrectionResDTO,
    UpdateCompanyInsightInternalReqDTO,
    UpdateCorrectionStatusReqDTO,
} from '../application/dtos/internal-correction.dto';
import { RagDataResDTO } from '../application/dtos/internal-correction-result.dto';

@ApiExcludeController()
@Public()
@SkipTransform()
@UseFilters(AiClientExceptionFilter)
@UseGuards(InternalApiKeyGuard)
@Controller('api/corrections')
export class AiCorrectionCompatController {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionRagDataService: CorrectionRagDataService,
        private readonly aiCorrectionCompatService: AiCorrectionCompatService
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
        @Body() body: unknown
    ): Promise<{ message: string }> {
        await this.aiCorrectionCompatService.saveCompatCorrectionResult(
            correctionId,
            body as CompatSaveCorrectionResultBody
        );
        return { message: '첨삭 결과가 저장되었습니다.' };
    }

    @Post(':correctionId/rag-data')
    async createRagData(
        @Param('correctionId', ParseIntPipe) correctionId: number,
        @Body() body: unknown
    ): Promise<{ message: string }> {
        await this.aiCorrectionCompatService.createCompatRagData(
            correctionId,
            body as CompatCreateRagDataBody
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
}
