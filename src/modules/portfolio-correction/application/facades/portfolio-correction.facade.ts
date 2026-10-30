import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { AiRelayPort } from 'src/common/ports/ai-relay.port';
import { CreateCorrectionReqDTO } from '../dtos/portfolio-correction.dto';
import { CorrectionItemResDTO } from '../dtos/correction-result.dto';
import { PortfolioCorrectionService } from '../services/portfolio-correction.service';
import { CorrectionItemService } from '../services/correction-item.service';
import { CorrectionMaterialService } from '../services/correction-material.service';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionMaterial } from '../../domain/correction-material.entity';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';

@Injectable()
export class PortfolioCorrectionFacade {
    private readonly logger = new Logger(PortfolioCorrectionFacade.name);

    constructor(
        private readonly portfolioCorrectionService: PortfolioCorrectionService,
        private readonly correctionItemService: CorrectionItemService,
        private readonly correctionMaterialService: CorrectionMaterialService,
        private readonly aiRelayPort: AiRelayPort
    ) {}

    @Transactional()
    async requestCorrection(userId: number, body: CreateCorrectionReqDTO): Promise<number> {
        await this.portfolioCorrectionService.validateCreation(userId);
        const correction = await this.portfolioCorrectionService.createCorrection(
            userId,
            body.title,
            body.companyName,
            body.positionName,
            body.jobDescription ?? '',
            body.jobDescriptionType
        );

        return correction.id;
    }

    @Transactional()
    async selectAndGenerate(correctionId: number, userId: number): Promise<CorrectionItemResDTO[]> {
        const correction = await this.portfolioCorrectionService.findByIdAndUserIdOrThrow(
            correctionId,
            userId
        );
        const materials = await this.correctionMaterialService.findByCorrectionId(correctionId);

        if (materials.length === 0) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'At least one correction material must exist before generation.',
            });
        }

        const items = await this.replaceCorrectionItems(correctionId, correction, materials);
        await this.portfolioCorrectionService.transitionToGenerating(correctionId);

        void this.delegateCorrectionGeneration(correctionId);

        return items;
    }

    async requestCompanyInsightCreation(correctionId: number, userId: number): Promise<void> {
        const shouldDelegate = await this.portfolioCorrectionService.requestCompanyInsightCreation(
            correctionId,
            userId
        );

        if (!shouldDelegate) {
            return;
        }

        void this.delegateCompanyInsightCreation(correctionId);
    }

    private async delegateCorrectionGeneration(correctionId: number): Promise<void> {
        try {
            await this.aiRelayPort.postJson({
                path: `/api/v1/corrections/${correctionId}/generate`,
                body: {},
            });
        } catch (error: unknown) {
            const message = `Failed to delegate correction generation to AI server: correctionId=${correctionId}`;
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(message, stack);
            void this.fallbackToStatus(correctionId, CorrectionStatus.FAILED);
        }
    }

    private async delegateCompanyInsightCreation(correctionId: number): Promise<void> {
        try {
            await this.aiRelayPort.postJson({
                path: `/api/v1/corrections/${correctionId}/rag`,
                body: {},
            });
        } catch (error: unknown) {
            const message = `Failed to delegate company insight generation to AI server: correctionId=${correctionId}`;
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(message, stack);
            void this.fallbackToStatus(correctionId, CorrectionStatus.RAG_FAILED);
        }
    }

    private async fallbackToStatus(
        correctionId: number,
        status: CorrectionStatus.FAILED | CorrectionStatus.RAG_FAILED
    ): Promise<void> {
        try {
            await this.portfolioCorrectionService.updateStatusWithTransition(correctionId, status);
        } catch (error: unknown) {
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `Failed to transition correction to ${status} status: correctionId=${correctionId}`,
                stack
            );
        }
    }

    private async replaceCorrectionItems(
        correctionId: number,
        correction: PortfolioCorrection,
        materials: CorrectionMaterial[]
    ): Promise<CorrectionItemResDTO[]> {
        await this.correctionItemService.deleteByCorrectionId(correctionId);

        const items = await Promise.all(
            materials.map((material) =>
                this.correctionItemService.createCorrectionItem(material, correction)
            )
        );

        return items.map((item) => CorrectionItemResDTO.from(item));
    }
}
