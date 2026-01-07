import { Module } from '@nestjs/common';
import { ExperienceController } from './presentation/experience.controller';

@Module({
    imports: [],
    controllers: [ExperienceController],
})
export class ExperienceModule {}
