import { Injectable } from '@nestjs/common';
import { InsightRepository } from '../../infrastructure/repositories/insight.repository';
import { Insight } from '../../domain/entities/insight.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InsightLogResDto, UpdateInsightReqDto } from '../dtos/insight-log.dto';
import { ActivityService } from './activity.service';
import { InsightActivityService } from './insight-activity.service';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class InsightService {
    constructor(
        private readonly insightRepository: InsightRepository,
        private readonly insightActivityService: InsightActivityService,
        private readonly activityService: ActivityService
    ) {}

    async findByIdOrThrow(id: number): Promise<Insight> {
        const insight = await this.insightRepository.findById(id);
        if (!insight) {
            throw new BusinessException(ErrorCode.LOG_NOT_FOUND);
        }
        return insight;
    }

    @Transactional()
    async updateInsight(
        userId: number,
        insightId: number,
        dto: UpdateInsightReqDto
    ): Promise<InsightLogResDto> {
        const log = await this.findByIdOrThrow(insightId);
        if (log.user.id !== userId) {
            throw new BusinessException(ErrorCode.NOT_LOG_OWNER);
        }

        if (dto.title && dto.title !== log.title) {
            // 로그 제목 중복 검사
            const isDuplicateName = await this.insightRepository.existsByTitleAndUser(
                dto.title,
                userId
            );
            if (isDuplicateName) {
                throw new BusinessException(ErrorCode.DUPLICATE_LOG_NAME);
            }
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
            const savedActivityIds =
                await this.insightActivityService.findAcitivityIdsByInsight(insightId);
            if (savedActivityIds.length > 0) {
                const activities = await this.activityService.findByIdsOrThrow(savedActivityIds);
                activityNames = activities.map((a) => a.name);
            }
        }

        const savedLog = await this.insightRepository.save(log);
        return InsightLogResDto.from(savedLog, activityNames);
    }
}
