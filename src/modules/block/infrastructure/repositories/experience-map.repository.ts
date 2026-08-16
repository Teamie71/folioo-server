import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExperienceMap } from '../../domain/experience-map.entity';

@Injectable()
export class ExperienceMapRepository {
    constructor(
        @InjectRepository(ExperienceMap)
        private readonly experienceMapRepository: Repository<ExperienceMap>
    ) {}

    save(experienceMap: ExperienceMap): Promise<ExperienceMap> {
        return this.experienceMapRepository.save(experienceMap);
    }

    async findByUserId(userId: number): Promise<ExperienceMap | null> {
        return this.experienceMapRepository.findOne({ where: { userId } });
    }
}
