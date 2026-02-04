import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Experience } from '../../domain/experience.entity';

@Injectable()
export class ExperienceRepository {
    constructor(
        @InjectRepository(Experience)
        private readonly experienceRepository: Repository<Experience>
    ) {}

    async save(experience: Experience): Promise<Experience> {
        return this.experienceRepository.save(experience);
    }

    async findById(id: number): Promise<Experience | null> {
        return this.experienceRepository.findOne({
            where: { id },
        });
    }

    async countByUserId(userId: number): Promise<number> {
        return this.experienceRepository.count({
            where: { user: { id: userId } },
        });
    }

    async existsByUserIdAndName(userId: number, name: string): Promise<boolean> {
        return this.experienceRepository.exists({
            where: { user: { id: userId }, name },
        });
    }
}
