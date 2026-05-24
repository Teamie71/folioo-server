import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualizationJob } from './domain/visualization-job.entity';
import { VisualizationSlide } from './domain/visualization-slide.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VisualizationJob, VisualizationSlide])],
})
export class VisualizationModule {}
