import { Inject, Injectable } from '@nestjs/common';
import { InsightRepository } from '../../infrastructure/repositories/insight.repository';
import { Insight, MAX_INSIGHTS_PER_USER } from '../../domain/entities/insight.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    CreateInsightLogReqDTO,
    InsightLogResDTO,
    UpdateInsightReqDTO,
} from '../dtos/insight-log.dto';
import { ActivityService } from './activity.service';
import { InsightActivityService } from './insight-activity.service';
import { Transactional } from 'typeorm-transactional';
import { EMBEDDING_SERVICE } from 'src/modules/embedding/embedding.interface';
import type { EmbeddingSupplier } from 'src/modules/embedding/embedding.interface';

@Injectable()
export class InsightService {
    constructor(
        private readonly insightRepository: InsightRepository,
        private readonly insightActivityService: InsightActivityService,
        private readonly activityService: ActivityService,
        @Inject(EMBEDDING_SERVICE)
        private embeddingService: EmbeddingSupplier
    ) {}

    async findByIdOrThrow(id: number): Promise<Insight> {
        const insight = await this.insightRepository.findById(id);
        if (!insight) {
            throw new BusinessException(ErrorCode.LOG_NOT_FOUND);
        }
        return insight;
    }

    async validateDuplicationOfTitle(title: string, userId: number) {
        const isDuplicateName = await this.insightRepository.existsByTitleAndUser(title, userId);
        if (isDuplicateName) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOG_NAME);
        }
    }

    async createInsight(userId: number, dto: CreateInsightLogReqDTO): Promise<InsightLogResDTO> {
        // 1. 도메인 로직 검사
        // 1-1. 로그 개수 제한 검증
        const count = await this.insightRepository.countByUser(userId);
        if (count > MAX_INSIGHTS_PER_USER) {
            throw new BusinessException(ErrorCode.LOG_MAX_LIMIT);
        }
        // 1-2. 로그 제목 중복 검사
        await this.validateDuplicationOfTitle(dto.title, userId);
        // 2. 텍스트를 벡터로 변환 (Embedding)
        const embedding = await this.embeddingService.getEmbedding(dto.description);
        // 3. 엔티티 생성 및 저장
        return await this.createInsightTransaction(userId, dto, embedding);
    }

    @Transactional()
    async createInsightTransaction(
        userId: number,
        dto: CreateInsightLogReqDTO,
        embedding: number[]
    ): Promise<InsightLogResDTO> {
        const insight: Insight = Insight.create(
            dto.title,
            dto.category,
            dto.description,
            embedding,
            userId
        );
        const savedLog = await this.insightRepository.save(insight);
        await this.activityService.findByIdsOrThrow(dto.activityIds);
        await this.insightActivityService.saveAllByIds(savedLog.id, dto.activityIds);
        const activityNames = await this.insightActivityService.findActivitiesByInsight(
            savedLog.id
        );
        return InsightLogResDTO.from(savedLog, activityNames);
    }

    @Transactional()
    async updateInsight(
        userId: number,
        insightId: number,
        dto: UpdateInsightReqDTO
    ): Promise<InsightLogResDTO> {
        const log = await this.findByIdOrThrow(insightId);
        if (log.user.id !== userId) {
            throw new BusinessException(ErrorCode.NOT_LOG_OWNER);
        }

        if (dto.title && dto.title !== log.title) {
            // 로그 제목 중복 검사
            await this.validateDuplicationOfTitle(dto.title, userId);
            log.title = dto.title;
        }

        if (dto.description && dto.description !== log.description) {
            log.description = dto.description;
        }

        if (dto.category && dto.category !== log.category) {
            log.category = dto.category;
        }

        let activityNames: string[] = [];
        if (dto.activityIds) {
            const currentActivities = await this.activityService.findByIdsOrThrow(dto.activityIds);
            await this.insightActivityService.compareAndReplaceByIds(insightId, dto.activityIds);
            activityNames = currentActivities.map((a) => a.name);
        } else {
            activityNames = await this.insightActivityService.findActivitiesByInsight(insightId);
        }

        const savedLog = await this.insightRepository.save(log);
        return InsightLogResDTO.from(savedLog, activityNames);
    }

    @Transactional()
    async deleteInsight(userId: number, insightId: number): Promise<number> {
        const log = await this.findByIdOrThrow(insightId);
        if (log.user.id !== userId) {
            throw new BusinessException(ErrorCode.NOT_LOG_OWNER);
        }
        await this.insightActivityService.deleteAllByInsightId(insightId);
        await this.insightRepository.deleteById(insightId);
        return log.id;
    }
}
