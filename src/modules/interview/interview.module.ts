import { Module } from '@nestjs/common';
import { AiRelayModule } from 'src/infra/ai-relay/ai-relay.module';
import { ExperienceModule } from 'src/modules/experience/experience.module';
import { InsightModule } from 'src/modules/insight/insight.module';
import { PortfolioModule } from 'src/modules/portfolio/portfolio.module';
import { InterviewController } from './presentation/interview.controller';
import { InterviewFacade } from './application/facades/interview.facade';
import { InterviewService } from './application/services/interview.service';
import { InterviewChatStreamRequestParserService } from './presentation/services/interview-chat-stream-request-parser.service';

@Module({
    imports: [AiRelayModule, ExperienceModule, InsightModule, PortfolioModule],
    controllers: [InterviewController],
    providers: [InterviewService, InterviewFacade, InterviewChatStreamRequestParserService],
    exports: [InterviewService, InterviewFacade],
})
export class InterviewModule {}
