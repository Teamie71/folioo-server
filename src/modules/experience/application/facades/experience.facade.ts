import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { ExperienceService } from '../services/experience.service';
// import { TicketService } from 'src/modules/ticket/application/services/ticket.service';
import {
    ExperienceResDTO,
    ExperienceStateResDTO,
    UpdateExperienceReqDTO,
} from '../dtos/experience.dto';
import { JobCategory } from '../../domain/enums/job-category.enum';
// import { TicketType } from 'src/modules/ticket/domain/enums/ticket-type.enum';

@Injectable()
export class ExperienceFacade {
    constructor(
        private readonly experienceService: ExperienceService
        // private readonly ticketService: TicketService
    ) {}

    @Transactional()
    async createExperience(
        userId: number,
        name: string,
        hopeJob: JobCategory
    ): Promise<ExperienceResDTO> {
        // await this.ticketService.consumeTicket(userId, TicketType.EXPERIENCE);
        await this.experienceService.validateCreation(userId, name);
        return this.experienceService.createExperience(userId, name, hopeJob);
    }

    async getExperiences(userId: number, keyword?: string): Promise<ExperienceResDTO[]> {
        return this.experienceService.getExperiences(userId, keyword);
    }

    async getExperience(experienceId: number, userId: number): Promise<ExperienceStateResDTO> {
        return this.experienceService.getExperience(experienceId, userId);
    }

    @Transactional()
    async updateExperience(
        experienceId: number,
        userId: number,
        body: UpdateExperienceReqDTO
    ): Promise<ExperienceResDTO> {
        return this.experienceService.updateExperience(experienceId, userId, body);
    }
}
