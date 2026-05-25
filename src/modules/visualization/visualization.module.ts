import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GcsStorageModule } from 'src/infra/gcs/gcs-storage.module';
import { VisualizationJob } from './domain/visualization-job.entity';
import { VisualizationSlide } from './domain/visualization-slide.entity';
import { VisualizationJobRepository } from './infrastructure/repositories/visualization-job.repository';
import { VisualizationSlideRepository } from './infrastructure/repositories/visualization-slide.repository';
import { VisualizationJobService } from './application/services/visualization-job.service';
import { VisualizationSlideService } from './application/services/visualization-slide.service';

@Module({
    imports: [TypeOrmModule.forFeature([VisualizationJob, VisualizationSlide]), GcsStorageModule],
    providers: [
        VisualizationJobRepository,
        VisualizationSlideRepository,
        VisualizationJobService,
        VisualizationSlideService,
    ],
    exports: [VisualizationJobService, VisualizationSlideService],
})
export class VisualizationModule {}
