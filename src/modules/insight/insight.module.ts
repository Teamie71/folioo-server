import { Module } from '@nestjs/common';
import { InsightController } from './presentation/insight.controller';

@Module({
    imports: [],
    controllers: [InsightController],
})
export class InsightModule {}
