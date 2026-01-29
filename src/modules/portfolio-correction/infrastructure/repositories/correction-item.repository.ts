import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectionItem } from '../../domain/correction-item.entity';

@Injectable()
export class CorrectionItemRepository {
    constructor(
        @InjectRepository(CorrectionItem)
        private readonly correctionItemRepository: Repository<CorrectionItem>
    ) {}

    save(correctionItem: CorrectionItem): Promise<CorrectionItem> {
        return this.correctionItemRepository.save(correctionItem);
    }
}
