import { Injectable } from '@nestjs/common';
import { CloudTasksPort } from 'src/common/ports/cloud-tasks.port';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { CreateVisualizationResDTO } from '../dtos/visualization.dto';
import { VisualizationJobService } from '../services/visualization-job.service';

@Injectable()
export class VisualizationFacade {
    constructor(
        private readonly portfolioService: PortfolioService,
        private readonly vizJobService: VisualizationJobService,
        private readonly cloudTasksPort: CloudTasksPort
    ) {}

    async createVisualization(
        userId: number,
        portfolioId: number,
        templateId: string
    ): Promise<CreateVisualizationResDTO> {
        await this.portfolioService.findByIdOrThrow(portfolioId, userId);

        const job = await this.vizJobService.createJob(portfolioId, userId, templateId);

        await this.cloudTasksPort.enqueueVisualizationTask({
            jobId: job.id,
            portfolioId,
            userId,
            templateId,
            idempotencyKey: `viz-generate-${job.id}`,
        });

        const res = new CreateVisualizationResDTO();
        res.jobId = job.id;
        return res;
    }
}
