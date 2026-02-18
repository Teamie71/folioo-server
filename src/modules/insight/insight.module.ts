import { Module } from '@nestjs/common';
import { InsightController } from './presentation/insight.controller';
import { Insight } from './domain/entities/insight.entity';
import { Activity } from './domain/entities/activity.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightRepository } from './infrastructure/repositories/insight.repository';
import { ActivityRepository } from './infrastructure/repositories/activity.repository';
import { InsightService } from './application/services/insight.service';
import { ActivityService } from './application/services/activity.service';
import { InsightActivity } from './domain/entities/insight-activity.entity';
import { InsightActivityRepository } from './infrastructure/repositories/insight-activity.repository';
import { InsightActivityService } from './application/services/insight-activity.service';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
    imports: [TypeOrmModule.forFeature([Insight, Activity, InsightActivity]), EmbeddingModule],
    controllers: [InsightController],
    providers: [
        InsightRepository,
        InsightActivityRepository,
        ActivityRepository,
        InsightService,
        InsightActivityService,
        ActivityService,
    ],
})
export class InsightModule {}
