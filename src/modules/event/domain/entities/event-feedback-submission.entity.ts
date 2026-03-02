import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { EventFeedbackReviewStatus } from '../enums/event-feedback-review-status.enum';
import { EventFeedbackSource } from '../enums/event-feedback-source.enum';
import { Event } from './event.entity';

@Entity('event_feedback_submission')
@Unique(['eventId', 'externalSubmissionId'])
@Index(['eventId'])
@Index(['userId'])
@Index(['phoneNum'])
export class EventFeedbackSubmission extends BaseEntity {
    @ManyToOne(() => Event, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'event_id' })
    event: Event;

    @Column({ name: 'event_id' })
    eventId: number;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id', type: 'int', nullable: true })
    userId: number | null;

    @Column({ name: 'phone_num', length: 20 })
    phoneNum: string;

    @Column({
        type: 'enum',
        enum: EventFeedbackSource,
        default: EventFeedbackSource.GOOGLE_FORM,
    })
    source: EventFeedbackSource;

    @Column({ name: 'external_submission_id', type: 'varchar', length: 100, nullable: true })
    externalSubmissionId: string | null;

    @Column({
        name: 'review_status',
        type: 'enum',
        enum: EventFeedbackReviewStatus,
        default: EventFeedbackReviewStatus.PENDING,
    })
    reviewStatus: EventFeedbackReviewStatus;

    @Column({ name: 'reviewed_by', type: 'varchar', nullable: true, length: 64 })
    reviewedBy: string | null;

    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt: Date | null;

    @Column({ name: 'review_note', type: 'varchar', nullable: true, length: 500 })
    reviewNote: string | null;

    @Column({ name: 'rewarded_participation_id', type: 'int', nullable: true })
    rewardedParticipationId: number | null;
}
