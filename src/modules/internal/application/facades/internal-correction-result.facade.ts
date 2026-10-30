import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { CorrectionItemService } from 'src/modules/portfolio-correction/application/services/correction-item.service';
import { CorrectionMaterialService } from 'src/modules/portfolio-correction/application/services/correction-material.service';
import { PortfolioCorrectionService } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';
import { PdfExtractionStatus } from 'src/modules/portfolio-correction/domain/enums/pdf-extraction-status.enum';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import {
    CorrectionMaterial,
    CorrectionMaterialInput,
    CORRECTION_MATERIAL_FIELD_MAX_LENGTH,
    CORRECTION_MATERIAL_NAME_MAX_LENGTH,
} from 'src/modules/portfolio-correction/domain/correction-material.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    PdfExtractionActivityReqDTO,
    PdfExtractionCallbackStatus,
    SavePdfExtractionResultReqDTO,
} from '../dtos/internal-correction-result.dto';

@Injectable()
export class InternalCorrectionResultFacade {
    private readonly logger = new Logger(InternalCorrectionResultFacade.name);

    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionMaterialService: CorrectionMaterialService,
        private readonly correctionItemService: CorrectionItemService
    ) {}

    @Transactional()
    async savePdfExtractionResult(
        correctionId: number,
        body: SavePdfExtractionResultReqDTO
    ): Promise<void> {
        const correction = await this.portfolioCorrectionService.findByIdWithUser(correctionId);

        if (correction.pdfExtractionStatus !== PdfExtractionStatus.GENERATING) {
            this.logger.warn(
                `Invalid pdf extraction callback status: correctionId=${correctionId}, current=${correction.pdfExtractionStatus}, callback=${body.status}`
            );
            throw new BusinessException(ErrorCode.CORRECTION_PDF_EXTRACTION_INVALID_STATUS, {
                reason: `pdfExtractionStatus must be GENERATING before accepting callback. current=${correction.pdfExtractionStatus}, callback=${body.status}`,
            });
        }

        if (body.status === PdfExtractionCallbackStatus.FAILED) {
            this.logger.error(
                `PDF extraction failed: correctionId=${correctionId}, errorMessage=${
                    body.errorMessage ?? ''
                }`
            );
            await this.portfolioCorrectionService.updatePdfExtractionStatus(
                correctionId,
                PdfExtractionStatus.FAILED
            );
            return;
        }

        if (!body.activities || body.activities.length === 0) {
            this.logger.error(
                `PDF extraction callback invalid payload: correctionId=${correctionId}, activities is empty`
            );
            throw new BusinessException(ErrorCode.CORRECTION_PDF_EXTRACTION_EMPTY_ACTIVITIES);
        }

        const createdMaterials: CorrectionMaterial[] =
            await this.correctionMaterialService.replaceMaterialsForCorrection(
                correctionId,
                body.activities.map((activity) => this.mapActivity(activity))
            );

        await this.correctionItemService.deleteByCorrectionId(correctionId);
        const correctionItems: CorrectionItem[] = createdMaterials.map((material) =>
            CorrectionItem.create(material, correction)
        );
        await this.correctionItemService.saveAll(correctionItems);
        await this.portfolioCorrectionService.updatePdfExtractionStatus(
            correctionId,
            PdfExtractionStatus.GENERATED
        );
    }

    private mapActivity(activity: PdfExtractionActivityReqDTO): CorrectionMaterialInput {
        return {
            name: this.truncate(activity.activityName, CORRECTION_MATERIAL_NAME_MAX_LENGTH),
            description: this.truncate(
                this.joinLines(activity.detail),
                CORRECTION_MATERIAL_FIELD_MAX_LENGTH
            ),
            responsibilities: this.truncate(
                this.joinLines(activity.responsibility),
                CORRECTION_MATERIAL_FIELD_MAX_LENGTH
            ),
            problemSolving: this.truncate(
                activity.problemSolving
                    .map(
                        (item) =>
                            `#${item.no}\n상황: ${item.situation}\n전략: ${item.strategy}\n이유: ${item.reason}`
                    )
                    .join('\n\n'),
                CORRECTION_MATERIAL_FIELD_MAX_LENGTH
            ),
            learnings: this.truncate(
                this.joinLines(activity.learning),
                CORRECTION_MATERIAL_FIELD_MAX_LENGTH
            ),
        };
    }

    private joinLines(lines: string[]): string {
        return lines.join('\n');
    }

    private truncate(value: string, maxLength: number): string {
        return Array.from(value).slice(0, maxLength).join('');
    }
}
