import { Inject, Injectable } from '@nestjs/common';
import { InsightRepository } from '../../infrastructure/repositories/insight.repository';
import { Insight, MAX_INSIGHTS_PER_USER } from '../../domain/entities/insight.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalInsightDetailResDTO } from '../../../internal/application/dtos/internal-insight.dto';
import {
    CreateInsightLogReqDTO,
    InsightLogResDTO,
    QueryLogsDTO,
    SummaryLogItemDTO,
    SummaryLogResDTO,
    UpdateInsightReqDTO,
} from '../dtos/insight-log.dto';
import { ActivityService } from './activity.service';
import { InsightActivityService } from './insight-activity.service';
import { Transactional } from 'typeorm-transactional';
import { EMBEDDING_SERVICE } from 'src/modules/embedding/embedding.interface';
import type { EmbeddingSupplier } from 'src/modules/embedding/embedding.interface';
import { InsightCategory } from '../../domain/enums/insight-category.enum';

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

    async getInsightById(insightId: number): Promise<InternalInsightDetailResDTO> {
        const log = await this.findByIdOrThrow(insightId);
        const activityNames = await this.insightActivityService.findActivitiesByInsight(insightId);
        return InternalInsightDetailResDTO.from(log, activityNames);
    }

    async validateDuplicationOfTitle(title: string, userId: number) {
        const isDuplicateName = await this.insightRepository.existsByTitleAndUser(title, userId);
        if (isDuplicateName) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOG_NAME);
        }
    }

    async getInsightLogs(userId: number, dto: QueryLogsDTO): Promise<InsightLogResDTO[]> {
        const { keyword, category, activityId } = dto;

        // 1. [활동 도메인] 활동 필터가 있으면 ID들을 먼저 가져옴
        let insightIds: number[] | undefined = undefined;
        if (activityId) {
            await this.activityService.findByIdOrThrow(activityId);
            insightIds = await this.insightActivityService.findInsightIdsByActivityId(activityId);
            if (!insightIds || insightIds.length === 0) {
                return [];
            }
        }

        // 2. [인사이트 도메인] 필터링된 ID 배열을 통째로 넘겨서 검색 (나머지 필터와 조합)
        const rawInsights = await this.insightRepository.search(
            userId,
            keyword,
            category,
            insightIds
        );

        if (rawInsights.length === 0) {
            return [];
        }

        // 3. DTO 조립
        const finalInsightIds = rawInsights.map((i) => i.id);
        const activitiesMap =
            await this.insightActivityService.getNamesByInsightIds(finalInsightIds);

        return rawInsights.map((insight) => {
            const activityNames = activitiesMap[insight.id] || [];
            return InsightLogResDTO.from(insight, activityNames);
        });
    }

    async getSummaryInsights(userId: number): Promise<SummaryLogResDTO[]> {
        // 1. 데이터 조회
        const rawInsights = await this.insightRepository.findAllByUserWithSimpleInfo(userId);
        const insightIds = rawInsights.map((insight) => insight.id);
        // 2. 활동명 매핑
        const activitiesMap = await this.insightActivityService.getNamesByInsightIds(insightIds);
        // 3. Map을 이용한 그룹핑 (Category -> SummaryLogItemDTO 배열)
        const groupedMap = new Map<InsightCategory, SummaryLogItemDTO[]>();

        for (const insight of rawInsights) {
            const activityNames = activitiesMap[insight.id] || [];
            const itemDto = SummaryLogItemDTO.from(insight, activityNames);
            // 맵에 카테고리가 없으면 빈 배열로 초기화
            if (!groupedMap.has(insight.category)) {
                groupedMap.set(insight.category, []);
            }
            // 해당 카테고리 배열에 DTO 푸시
            groupedMap.get(insight.category)!.push(itemDto);
        }

        // 4. 조립된 Map을 SummaryLogResDTO 배열로 변환
        return Array.from(groupedMap.entries()).map(([category, items]) =>
            SummaryLogResDTO.from(category, items)
        );
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
        // 1-3. 액티비티 ID 유효성 검사
        if (dto.activityIds && dto.activityIds.length > 0) {
            await this.activityService.findByIdsOrThrow(dto.activityIds);
        }
        // 2. 텍스트를 벡터로 변환 (Embedding)
        const textToEmbed = `title: ${dto.title}\ndescription: ${dto.description}`;
        const embedding = await this.embeddingService.getEmbedding(textToEmbed);
        // 3. 엔티티 생성 및 저장
        return await this.createInsightTransaction(userId, dto, embedding);
    }

    @Transactional()
    async createInsightTransaction(
        userId: number,
        dto: CreateInsightLogReqDTO,
        embedding: number[]
    ): Promise<InsightLogResDTO> {
        // double-check
        const count = await this.insightRepository.countByUser(userId);
        if (count > MAX_INSIGHTS_PER_USER) throw new BusinessException(ErrorCode.LOG_MAX_LIMIT);

        const insight: Insight = Insight.create(
            dto.title,
            dto.category,
            dto.description,
            embedding,
            userId
        );
        const savedLog = await this.insightRepository.save(insight);
        await this.insightActivityService.saveAllByIds(savedLog.id, dto.activityIds);
        const activityNames = await this.insightActivityService.findActivitiesByInsight(
            savedLog.id
        );
        return InsightLogResDTO.from(savedLog, activityNames);
    }

    async searchInsightWithSimilarity(
        userId: number,
        searchText: string,
        targetThreshold: number,
        limit: number = 5
    ): Promise<InternalInsightDetailResDTO[]> {
        if (!searchText || searchText.trim() === '') {
            return [];
        }
        const queryEmbedding = await this.embeddingService.getEmbedding(searchText);
        const similarInsights = await this.insightRepository.findSimilarInsights(
            userId,
            queryEmbedding,
            targetThreshold,
            limit
        );
        const insightIds = similarInsights.map((result) => result.insight.id);
        const activitiesMap = await this.insightActivityService.getNamesByInsightIds(insightIds);
        return similarInsights.map(({ insight, similarityScore }) =>
            InternalInsightDetailResDTO.fromLogRes(
                InsightLogResDTO.from(insight, activitiesMap[insight.id] || []),
                similarityScore
            )
        );
    }

    async updateInsight(
        userId: number,
        insightId: number,
        dto: UpdateInsightReqDTO
    ): Promise<InsightLogResDTO> {
        // 1. 도메인 로직 검사
        const log = await this.findByIdOrThrow(insightId);
        if (log.user.id !== userId) {
            throw new BusinessException(ErrorCode.NOT_LOG_OWNER);
        }
        if (dto.title && dto.title !== log.title) {
            // 로그 제목 중복 검사
            await this.validateDuplicationOfTitle(dto.title, userId);
        }
        if (dto.activityIds) {
            await this.activityService.findByIdsOrThrow(dto.activityIds);
        }

        let newEmbedding: number[] | undefined = undefined;
        const isTitleChanged = dto.title && dto.title !== log.title;
        const isDescriptionChanged = dto.description && dto.description !== log.description;
        if (isTitleChanged || isDescriptionChanged) {
            const targetTitle = dto.title ?? log.title;
            const targetDescription = dto.description ?? log.description;

            const textToEmbed = `title: ${targetTitle}\ndescription: ${targetDescription}`;
            newEmbedding = await this.embeddingService.getEmbedding(textToEmbed);
        }
        return await this.updateInsightTransaction(insightId, dto, newEmbedding);
    }

    @Transactional()
    async updateInsightTransaction(
        insightId: number,
        dto: UpdateInsightReqDTO,
        newEmbedding?: number[]
    ): Promise<InsightLogResDTO> {
        const log = await this.findByIdOrThrow(insightId);

        if (dto.title && dto.title !== log.title) {
            log.title = dto.title;
            if (newEmbedding) {
                log.embedding = newEmbedding;
            }
        }

        if (dto.description && dto.description !== log.description) {
            log.description = dto.description;
            if (newEmbedding) {
                log.embedding = newEmbedding;
            }
        }

        if (dto.category && dto.category !== log.category) {
            log.category = dto.category;
        }

        if (dto.activityIds) {
            await this.insightActivityService.compareAndReplaceByIds(insightId, dto.activityIds);
        }

        const activityNames = await this.insightActivityService.findActivitiesByInsight(insightId);
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
