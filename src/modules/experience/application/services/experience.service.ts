import { Injectable } from '@nestjs/common';
import { ExperienceRepository } from '../../infrastructure/repositories/experience.repository';
import { Experience, MAX_EXPERIENCES_PER_USER } from '../../domain/experience.entity';
import { ExperienceResDTO, UpdateExperienceReqDTO } from '../dtos/experience.dto';
import { JobCategory } from '../../domain/enums/job-category.enum';
import { ExperienceStatus } from '../../domain/enums/experience-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class ExperienceService {
    constructor(private readonly experienceRepository: ExperienceRepository) {}

    async findByIdOrThrow(id: number, userId: number): Promise<Experience> {
        const experience = await this.experienceRepository.findByIdAndUserId(id, userId);
        if (!experience) {
            throw new BusinessException(ErrorCode.EXPERIENCE_NOT_FOUND);
        }
        return experience;
    }

    async saveInterviewSessionId(
        experienceId: number,
        userId: number,
        sessionId: string
    ): Promise<void> {
        const experience = await this.findByIdOrThrow(experienceId, userId);
        experience.sessionId = sessionId;
        await this.experienceRepository.save(experience);
    }

    async transitionToGenerate(experience: Experience): Promise<Experience> {
        if (experience.status !== ExperienceStatus.ON_CHAT) {
            throw new BusinessException(ErrorCode.EXPERIENCE_INVALID_STATUS, {
                currentStatus: experience.status,
            });
        }
        if (!experience.sessionId) {
            throw new BusinessException(ErrorCode.EXPERIENCE_SESSION_NOT_READY, {
                experienceId: experience.id,
            });
        }
        experience.status = ExperienceStatus.GENERATE;
        return this.experienceRepository.save(experience);
    }

    async transitionToDone(experienceId: number): Promise<void> {
        const experience = await this.findByIdInternalOrThrow(experienceId);
        if (experience.status !== ExperienceStatus.GENERATE) {
            return;
        }
        experience.status = ExperienceStatus.DONE;
        await this.experienceRepository.save(experience);
    }

    async revertToOnChat(experienceId: number): Promise<void> {
        const experience = await this.findByIdInternalOrThrow(experienceId);
        if (experience.status !== ExperienceStatus.GENERATE) {
            return;
        }
        experience.status = ExperienceStatus.ON_CHAT;
        await this.experienceRepository.save(experience);
    }

    private async findByIdInternalOrThrow(experienceId: number): Promise<Experience> {
        const experience = await this.experienceRepository.findById(experienceId);
        if (!experience) {
            throw new BusinessException(ErrorCode.EXPERIENCE_NOT_FOUND);
        }
        return experience;
    }

    async getExperiences(userId: number, keyword?: string): Promise<ExperienceResDTO[]> {
        const experiences = await this.experienceRepository.findAllByUserId(userId, keyword);
        return experiences.map((experience) => ExperienceResDTO.from(experience));
    }

    async updateExperience(
        experienceId: number,
        userId: number,
        body: UpdateExperienceReqDTO
    ): Promise<ExperienceResDTO> {
        const experience = await this.findByIdOrThrow(experienceId, userId);

        if (body.name !== undefined) {
            experience.name = body.name;
        }

        if (body.hopeJob !== undefined) {
            experience.hopeJob = body.hopeJob;
        }

        const updatedExperience = await this.experienceRepository.save(experience);
        return ExperienceResDTO.from(updatedExperience);
    }

    async validateCreation(userId: number): Promise<void> {
        const count = await this.experienceRepository.countByUserId(userId);

        if (count >= MAX_EXPERIENCES_PER_USER) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAX_LIMIT);
        }
    }

    async createExperience(
        userId: number,
        name: string,
        hopeJob: JobCategory
    ): Promise<ExperienceResDTO> {
        const experience = Experience.create(name, hopeJob, userId);
        const savedExperience = await this.experienceRepository.save(experience);
        return ExperienceResDTO.from(savedExperience);
    }

    async deleteExperience(experienceId: number): Promise<void> {
        await this.experienceRepository.deleteById(experienceId);
    }
}
