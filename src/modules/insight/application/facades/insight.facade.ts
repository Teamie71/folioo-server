import { Injectable } from '@nestjs/common';
import { CreateInsightLogReqDTO, InsightLogResDTO } from '../dtos/insight-log.dto';
import { InsightService } from '../services/insight.service';

@Injectable()
export class InsightFacade {
    constructor(private readonly insightService: InsightService) {}

    async createInsight(userId: number, body: CreateInsightLogReqDTO): Promise<InsightLogResDTO> {
        return this.insightService.createInsight(userId, body);
    }
}
