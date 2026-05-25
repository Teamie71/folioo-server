import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GcsStorageModule } from 'src/infra/gcs/gcs-storage.module';
import { VisualizationJob } from './domain/visualization-job.entity';
import { VisualizationSlide } from './domain/visualization-slide.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VisualizationJob, VisualizationSlide]), GcsStorageModule],
})
export class VisualizationModule {}
