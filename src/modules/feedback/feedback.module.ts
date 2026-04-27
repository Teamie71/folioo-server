import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackForm } from './domain/entities/feedback-form.entity';
import { FeedbackResponse } from './domain/entities/feedback-response.entity';
import { FeedbackFormService } from './application/services/feedback-form.service';
import { FeedbackFormRepository } from './infrastructure/repositories/feedback-form.repository';
import { FeedbackFormController } from './presentation/feedback-form.controller';

@Module({
    imports: [TypeOrmModule.forFeature([FeedbackForm, FeedbackResponse])],
    controllers: [FeedbackFormController],
    providers: [FeedbackFormRepository, FeedbackFormService],
    exports: [FeedbackFormRepository, FeedbackFormService],
})
export class FeedbackModule {}
