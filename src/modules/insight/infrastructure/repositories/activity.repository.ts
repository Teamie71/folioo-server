import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity } from '../../domain/entities/activity.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ActivityRepository {
    constructor(
        @InjectRepository(Activity)
        private readonly activityRepository: Repository<Activity>
    ) {}

    async save(activity: Activity): Promise<Activity> {
        return await this.activityRepository.save(activity);
    }

    async findById(id: number): Promise<Activity | null> {
        return await this.activityRepository.findOne({
            where: {
                id: id,
            },
        });
    }

    async findByIds(ids: number[]): Promise<Activity[]> {
        return await this.activityRepository.find({
            where: { id: In(ids) },
        });
    }

    async findAllByUser(userId: number): Promise<Activity[]> {
        return await this.activityRepository.find({
            where: {
                userId: userId,
            },
        });
    }

    async countByUserId(userId: number): Promise<number> {
        return await this.activityRepository.count({
            where: {
                userId: userId,
            },
        });
    }

    async findByNameAndUser(activityName: string, userId: number): Promise<Activity | null> {
        return await this.activityRepository.findOne({
            where: {
                name: activityName,
                userId: userId,
            },
        });
    }

    async deleteById(id: number): Promise<void> {
        await this.activityRepository.delete({
            id: id,
        });
    }
}
