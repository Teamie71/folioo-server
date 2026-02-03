import { Injectable } from '@nestjs/common';
import { ExperienceRepository } from '../../infrastructure/repositories/experience.repository';
import { Experience, MAX_EXPERIENCES_PER_USER } from '../../domain/experience.entity';
import { ExperienceResDto } from '../dtos/experience.dto';
import { JobCategory } from '../../domain/enums/job-category.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class ExperienceService {
    constructor(private readonly experienceRepository: ExperienceRepository) {}

    async validateCreation(userId: number, name: string): Promise<void> {
        const [count, isDuplicate] = await Promise.all([
            this.experienceRepository.countByUserId(userId),
            this.experienceRepository.existsByUserIdAndName(userId, name),
        ]);

        if (count >= MAX_EXPERIENCES_PER_USER) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAX_LIMIT);
        }

        if (isDuplicate) {
            throw new BusinessException(ErrorCode.DUPLICATE_EXPERIENCE_NAME);
        }
    }

    async createExperience(
        userId: number,
        name: string,
        hopeJob: JobCategory
    ): Promise<ExperienceResDto> {
        const experience = Experience.create(name, hopeJob, userId);
        const savedExperience = await this.experienceRepository.save(experience);

        return ExperienceResDto.from(savedExperience);
    }
}
