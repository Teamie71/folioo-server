import { Module } from '@nestjs/common';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { ExperienceModule } from 'src/modules/experience/experience.module';
import { InterviewController } from './presentation/interview.controller';
import { InterviewFacade } from './application/facades/interview.facade';
import { InterviewService } from './application/services/interview.service';

@Module({
    imports: [AiRelayModule, ExperienceModule],
    controllers: [InterviewController],
    providers: [InterviewService, InterviewFacade],
    exports: [InterviewService, InterviewFacade],
})
export class InterviewModule {}
