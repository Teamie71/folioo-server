import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperienceController } from './presentation/experience.controller';
import { Experience } from './domain/experience.entity';
import { ExperienceChat } from './domain/experience-chat.entity';
import { ExperienceRepository } from './infrastructure/repositories/experience.repository';
import { ExperienceChatRepository } from './infrastructure/repositories/experience-chat.repository';
import { ExperienceService } from './application/services/experience.service';
import { ExperienceFacade } from './application/facades/experience.facade';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TypeOrmModule.forFeature([Experience, ExperienceChat]), UserModule],
    controllers: [ExperienceController],
    providers: [
        ExperienceRepository,
        ExperienceChatRepository,
        ExperienceService,
        ExperienceFacade,
    ],
})
export class ExperienceModule {}
