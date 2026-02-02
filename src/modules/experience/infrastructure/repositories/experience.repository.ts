import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Experience } from '../../domain/experience.entity';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ExperienceRepository {
    constructor(
        @InjectRepository(Experience)
        private readonly experienceRepository: Repository<Experience>
    ) {}

    async save(experience: Experience): Promise<Experience> {
        try {
            return await this.experienceRepository.save(experience);
        } catch (error) {
            if (
                error instanceof QueryFailedError &&
                (error as QueryFailedError & { code?: string }).code === PG_UNIQUE_VIOLATION
            ) {
                throw new BusinessException(ErrorCode.DUPLICATE_EXPERIENCE_NAME);
            }
            throw error;
        }
    }

    async findByIdOrThrow(id: number): Promise<Experience> {
        const experience = await this.experienceRepository.findOne({
            where: { id },
        });
        if (!experience) {
            throw new BusinessException(ErrorCode.EXPERIENCE_NOT_FOUND);
        }
        return experience;
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
