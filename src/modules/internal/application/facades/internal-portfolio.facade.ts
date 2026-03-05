import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { ExperienceService } from 'src/modules/experience/application/services/experience.service';
import {
    InternalPortfolioDetailResDTO,
    PortfolioGenerationStatus,
    UpdatePortfolioResultReqDTO,
} from '../dtos/internal-portfolio.dto';

@Injectable()
export class InternalPortfolioFacade {
    constructor(
        private readonly portfolioService: PortfolioService,
        private readonly experienceService: ExperienceService
    ) {}

    async getPortfolioDetail(portfolioId: number): Promise<InternalPortfolioDetailResDTO> {
        const portfolio = await this.portfolioService.findByIdWithExperienceOrThrow(portfolioId);
        return InternalPortfolioDetailResDTO.from(portfolio);
    }

    @Transactional()
    async savePortfolioResult(
        portfolioId: number,
        body: UpdatePortfolioResultReqDTO
    ): Promise<void> {
        const portfolio = await this.portfolioService.findByIdWithExperienceOrThrow(portfolioId);
        const experienceId = portfolio.experience?.id;

        if (body.status === PortfolioGenerationStatus.COMPLETED) {
            await this.portfolioService.completeGeneration(portfolioId, {
                description: body.description ?? '',
                responsibilities: body.responsibilities ?? '',
                problemSolving: body.problemSolving ?? '',
                learnings: body.learnings ?? '',
            });
            if (experienceId) {
                await this.experienceService.transitionToDone(experienceId);
            }
            return;
        }

        await this.portfolioService.failGeneration(portfolioId);
        if (experienceId) {
            await this.experienceService.revertToOnChat(experienceId);
        }
    }
}
