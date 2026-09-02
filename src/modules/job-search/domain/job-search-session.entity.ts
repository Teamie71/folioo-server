import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ValueKind } from './enums/value-kind.enum';
import { JobSearchStatus } from './enums/job-search-status.enum';

export interface ValueComparisonLogEntry {
    sequence: number;
    left: ValueKind;
    right: ValueKind;
    chosen: ValueKind;
}

@Entity('job_search_sessions')
export class JobSearchSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', name: 'user_id', nullable: true })
    userId: number | null;

    @Column({ type: 'varchar', length: 20, default: JobSearchStatus.VALUES_IN_PROGRESS })
    status: JobSearchStatus;

    @Column({ type: 'jsonb', name: 'values_insertion_order' })
    valuesInsertionOrder: ValueKind[];

    @Column({ type: 'jsonb', name: 'values_answer_log' })
    valuesAnswerLog: ValueComparisonLogEntry[];

    @Column({ type: 'jsonb', name: 'values_ranking', nullable: true })
    valuesRanking: ValueKind[] | null;

    @Column({ type: 'jsonb', name: 'values_weights', nullable: true })
    valuesWeights: Partial<Record<ValueKind, number>> | null;

    @Column({ type: 'timestamptz', name: 'values_completed_at', nullable: true })
    valuesCompletedAt: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    result: Record<string, unknown> | null;

    @Column({ type: 'timestamptz', name: 'result_expires_at', nullable: true })
    resultExpiresAt: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;

    static create(userId: number | null, insertionOrder: ValueKind[]): JobSearchSession {
        const session = new JobSearchSession();
        session.userId = userId;
        session.status = JobSearchStatus.VALUES_IN_PROGRESS;
        session.valuesInsertionOrder = insertionOrder;
        session.valuesAnswerLog = [];
        session.valuesRanking = null;
        session.valuesWeights = null;
        session.valuesCompletedAt = null;
        session.result = null;
        session.resultExpiresAt = null;
        return session;
    }

    completeValues(ranking: ValueKind[], weights: Partial<Record<ValueKind, number>>): void {
        this.valuesRanking = ranking;
        this.valuesWeights = weights;
        this.valuesCompletedAt = new Date();
        this.status = JobSearchStatus.VALUES_DONE;
    }
}
