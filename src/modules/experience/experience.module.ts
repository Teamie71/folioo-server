import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperienceController } from './presentation/experience.controller';
import { Experience } from './domain/experience.entity';
import { ExperienceRepository } from './infrastructure/repositories/experience.repository';
import { ExperienceService } from './application/services/experience.service';
import { ExperienceFacade } from './application/facades/experience.facade';
import { TicketModule } from '../ticket/ticket.module';

@Module({
    imports: [TypeOrmModule.forFeature([Experience]), TicketModule],
    controllers: [ExperienceController],
    providers: [ExperienceRepository, ExperienceService, ExperienceFacade],
})
export class ExperienceModule {}
