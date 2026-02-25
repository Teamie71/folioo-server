import { Injectable } from '@nestjs/common';
import { ActivityRepository } from '../../infrastructure/repositories/activity.repository';
import { Activity, MAX_ACTIVITY_TAG_PER_USER } from '../../domain/entities/activity.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ActivityNameResDTO } from '../dtos/activity-tag.dto';
import { Transactional } from 'typeorm-transactional';
import { InsightActivityService } from './insight-activity.service';

@Injectable()
export class ActivityService {
    constructor(
        private readonly activityRepository: ActivityRepository,
        private readonly insightActivityService: InsightActivityService
    ) {}

    async findByIdOrThrow(id: number): Promise<Activity> {
        const activity = await this.activityRepository.findById(id);
        if (!activity) {
            throw new BusinessException(ErrorCode.ACTIVITY_NOT_FOUND);
        }
        return activity;
    }

    async findByIdsOrThrow(ids: number[]): Promise<Activity[]> {
        const activities = await this.activityRepository.findByIds(ids);
        if (activities.length !== ids.length) {
            throw new BusinessException(ErrorCode.ACTIVITY_NOT_FOUND);
        }
        return activities;
    }

    async getTagsByUser(userId: number): Promise<ActivityNameResDTO[]> {
        const tags = await this.activityRepository.findAllByUser(userId);
        return tags.map((tag) => {
            return ActivityNameResDTO.of(tag.id, tag.name);
        });
    }

    @Transactional()
    async createActivity(userId: number, activityName: string): Promise<ActivityNameResDTO> {
        // 검증1: 개수 검증 - 최대 10개
        const countByUser = await this.activityRepository.countByUserId(userId);
        if (countByUser >= MAX_ACTIVITY_TAG_PER_USER) {
            throw new BusinessException(ErrorCode.FULL_ACTIVITY_TAG);
        }
        // 검증2: 활동명 중복 검사
        const isDuplicate = await this.activityRepository.findByNameAndUser(activityName, userId);
        if (isDuplicate !== null) {
            throw new BusinessException(ErrorCode.DUPLICATE_ACTIVITY_NAME);
        }
        // 객체 생성 및 저장
        const newActivity: Activity = Activity.create(activityName, userId);
        const savedActivity = await this.activityRepository.save(newActivity);
        return ActivityNameResDTO.of(savedActivity.id, savedActivity.name);
    }

    @Transactional()
    async deleteActivity(userId: number, tagId: number): Promise<void> {
        // 검증 1: 활동 분류 태그 존재 여부 검증
        const activity: Activity = await this.findByIdOrThrow(tagId);
        // 검증 2: 유저의 태그 삭제 권한 검증
        if ((activity.user as unknown as number) !== userId) {
            throw new BusinessException(ErrorCode.NOT_ACTIVITY_TAG_OWNER);
        }
        // 인사이트 로그와의 연결 삭제
        await this.insightActivityService.deleteAllByActivityId(activity.id);
        // 활동 분류 태그 삭제
        await this.activityRepository.deleteById(activity.id);
    }
}
