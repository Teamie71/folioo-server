import { Injectable } from '@nestjs/common';
import { ExperienceMapRepository } from '../../infrastructure/repositories/experience-map.repository';
import { ExperienceMap } from '../../domain/experience-map.entity';

@Injectable()
export class ExperienceMapService {
    constructor(private readonly experienceMapRepository: ExperienceMapRepository) {}

    async getOrCreate(userId: number): Promise<ExperienceMap> {
        const existing = await this.experienceMapRepository.findByUserId(userId);
        if (existing) {
            return existing;
        }

        const experienceMap = new ExperienceMap();
        experienceMap.userId = userId;
        experienceMap.mapVersion = '1';
        return this.experienceMapRepository.save(experienceMap);
    }

    async bumpVersion(experienceMap: ExperienceMap): Promise<ExperienceMap> {
        experienceMap.mapVersion = String(BigInt(experienceMap.mapVersion) + 1n);
        return this.experienceMapRepository.save(experienceMap);
    }
}
