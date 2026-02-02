import { Injectable } from '@nestjs/common';
import { ExperienceRepository } from '../../infrastructure/repositories/experience.repository';
import { ExperienceChatRepository } from '../../infrastructure/repositories/experience-chat.repository';
import { Experience, MAX_EXPERIENCES_PER_USER } from '../../domain/experience.entity';
import { ExperienceChat } from '../../domain/experience-chat.entity';
import { ExperienceResDTO } from '../dtos/experience.dto';
import { JobCategory } from '../../domain/enums/job-category.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { User } from 'src/modules/user/domain/user.entity';

@Injectable()
export class ExperienceService {
    constructor(
        private readonly experienceRepository: ExperienceRepository,
        private readonly experienceChatRepository: ExperienceChatRepository
    ) {}

    async validateCreation(userId: number, name: string): Promise<void> {
        const count = await this.experienceRepository.countByUserId(userId);
        if (count >= MAX_EXPERIENCES_PER_USER) {
            throw new BusinessException(ErrorCode.EXPERIENCE_MAX_LIMIT);
        }

        const isDuplicate = await this.experienceRepository.existsByUserIdAndName(userId, name);
        if (isDuplicate) {
            throw new BusinessException(ErrorCode.DUPLICATE_EXPERIENCE_NAME);
        }
    }

    async createExperience(
        userId: number,
        name: string,
        hopeJob: JobCategory
    ): Promise<ExperienceResDTO> {
        const experience = new Experience();
        experience.name = name;
        experience.hopeJob = hopeJob;
        experience.user = { id: userId } as User;

        const savedExperience = await this.experienceRepository.save(experience);

        const experienceChat = new ExperienceChat();
        experienceChat.chat = {};
        experienceChat.experience = savedExperience;

        await this.experienceChatRepository.save(experienceChat);

        return ExperienceResDTO.from(savedExperience);
    }
}
