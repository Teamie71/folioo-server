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
}
