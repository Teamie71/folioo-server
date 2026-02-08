import { Injectable } from '@nestjs/common';
import { ActivityRepository } from '../../infrastructure/repositories/activity.repository';
import { Activity } from '../../domain/entities/activity.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class ActivityService {
    constructor(private readonly activityRepository: ActivityRepository) {}

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
}
