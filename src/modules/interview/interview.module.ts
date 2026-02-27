import { Module } from '@nestjs/common';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { ExperienceModule } from 'src/modules/experience/experience.module';
import { InterviewFacade } from './application/facades/interview.facade';
import { InterviewService } from './application/services/interview.service';
import { InterviewController } from './presentation/interview.controller';

@Module({
    imports: [AiRelayModule, ExperienceModule],
    controllers: [InterviewController],
    providers: [InterviewService, InterviewFacade],
})
export class InterviewModule {}
