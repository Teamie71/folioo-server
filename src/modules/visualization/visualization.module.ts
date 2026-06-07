import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudTasksModule } from 'src/infra/cloud-tasks/cloud-tasks.module';
import { GcsStorageModule } from 'src/infra/gcs/gcs-storage.module';
import { PortfolioModule } from 'src/modules/portfolio/portfolio.module';
import { VisualizationJob } from './domain/visualization-job.entity';
import { VisualizationSlide } from './domain/visualization-slide.entity';
import { VisualizationJobRepository } from './infrastructure/repositories/visualization-job.repository';
import { VisualizationSlideRepository } from './infrastructure/repositories/visualization-slide.repository';
import { VisualizationJobService } from './application/services/visualization-job.service';
import { VisualizationSlideService } from './application/services/visualization-slide.service';
import { VisualizationFacade } from './application/facades/visualization.facade';
import { VisualizationController } from './presentation/visualization.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([VisualizationJob, VisualizationSlide]),
        GcsStorageModule,
        CloudTasksModule,
        PortfolioModule,
    ],
    controllers: [VisualizationController],
    providers: [
        VisualizationJobRepository,
        VisualizationSlideRepository,
        VisualizationJobService,
        VisualizationSlideService,
        VisualizationFacade,
    ],
    exports: [VisualizationJobService, VisualizationSlideService, GcsStorageModule],
})
export class VisualizationModule {}
