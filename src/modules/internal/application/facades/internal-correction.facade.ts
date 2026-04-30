import { Injectable } from '@nestjs/common';
import {
    InternalCorrectionPayload,
    PortfolioCorrectionService,
} from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';

@Injectable()
export class InternalCorrectionFacade {
    constructor(private readonly portfolioCorrectionService: PortfolioCorrectionService) {}

    async getInternalCorrectionDetail(correctionId: number): Promise<InternalCorrectionPayload> {
        return this.portfolioCorrectionService.getInternalCorrectionDetail(correctionId);
    }
}
