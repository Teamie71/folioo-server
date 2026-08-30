import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { CorrectionMaterialService } from '../services/correction-material.service';
import { PdfExtractService } from '../services/pdf-extract.service';
import {
    ExternalPortfolioListResDTO,
    StructuredPortfolioResDTO,
    UpdatePortfolioBlockReqDTO,
} from '../dtos/external-portfolio.dto';
import { MAX_CORRECTION_MATERIALS } from '../../domain/correction-material.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PdfExtractionStatus } from 'src/modules/portfolio-correction/domain/enums/pdf-extraction-status.enum';

@Injectable()
export class ExternalPortfolioFacade {
    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionMaterialService: CorrectionMaterialService,
        private readonly correctionItemService: CorrectionItemService,
        private readonly pdfExtractService: PdfExtractService
    ) {}

    async extractPortfolio(
        userId: number,
        correctionId: number,
        fileBuffer: Buffer,
        fileName: string
    ): Promise<string> {
        await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(correctionId, userId);

        const { message } = await this.pdfExtractService.extractText(
            correctionId,
            fileBuffer,
            fileName
        );

        await this.portfolioCorrectionService.updatePdfExtractionStatus(
            correctionId,
            PdfExtractionStatus.GENERATING
        );
        await this.portfolioCorrectionService.updateOriginalFileName(correctionId, fileName);
        return message;
    }

    async getSelectedPortfolios(
        correctionId: number,
        userId: number
    ): Promise<ExternalPortfolioListResDTO> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );

        const materials = await this.correctionMaterialService.findByCorrectionId(correctionId);
        return ExternalPortfolioListResDTO.from(
            correction.pdfExtractionStatus,
            correction.originalFileName,
            materials
        );
    }

    @Transactional()
    async createExternalPortfolioBlock(
        correctionId: number,
        userId: number
    ): Promise<StructuredPortfolioResDTO> {
        await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(correctionId, userId);

        const currentCount = await this.correctionMaterialService.countByCorrectionId(correctionId);
        if (currentCount >= MAX_CORRECTION_MATERIALS) {
            throw new BusinessException(ErrorCode.CORRECTION_BLOCK_LIMIT_EXCEEDED);
        }

        const savedMaterial =
            await this.correctionMaterialService.createEmptyMaterial(correctionId);
        return StructuredPortfolioResDTO.from(savedMaterial);
    }

    @Transactional()
    async updateExternalPortfolio(
        portfolioId: number,
        userId: number,
        body: UpdatePortfolioBlockReqDTO
    ): Promise<StructuredPortfolioResDTO> {
        const updatedMaterial = await this.correctionMaterialService.updateMaterial(
            portfolioId,
            userId,
            {
                name: body.name,
                description: body.description,
                responsibilities: body.responsibilities,
                problemSolving: body.problemSolving,
                learnings: body.learnings,
            }
        );
        return StructuredPortfolioResDTO.from(updatedMaterial);
    }

    @Transactional()
    async deleteExternalPortfolio(portfolioId: number, userId: number): Promise<void> {
        await this.correctionMaterialService.findByIdAndUserIdOrThrow(portfolioId, userId);

        await this.correctionItemService.deleteByMaterialId(portfolioId);
        await this.correctionMaterialService.deleteMaterial(portfolioId, userId);
    }
}
