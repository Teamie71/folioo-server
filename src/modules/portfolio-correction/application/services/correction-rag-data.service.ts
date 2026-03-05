import { Injectable } from '@nestjs/common';
import { CorrectionRagDataRepository } from '../../infrastructure/repositories/correction-rag-data.repository';
import { CorrectionRagData } from '../../domain/correction-rag-data.entity';

@Injectable()
export class CorrectionRagDataService {
    constructor(private readonly correctionRagDataRepository: CorrectionRagDataRepository) {}

    async createRagData(
        correctionId: number,
        searchQuery: string,
        searchResults: Record<string, unknown>
    ): Promise<CorrectionRagData> {
        const ragData = CorrectionRagData.create(correctionId, searchQuery, searchResults);
        return this.correctionRagDataRepository.save(ragData);
    }

    findByCorrectionId(correctionId: number): Promise<CorrectionRagData[]> {
        return this.correctionRagDataRepository.findByCorrectionId(correctionId);
    }
}
