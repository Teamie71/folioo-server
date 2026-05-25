import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { VisualizationJobStatus } from './enums/visualization-job-status.enum';
import { PipelineStage } from './enums/pipeline-stage.enum';
import { User } from '../../user/domain/user.entity';
import { Portfolio } from '../../portfolio/domain/portfolio.entity';

interface SlidePlanEntry {
    order: number;
    source_slide_id: string;
    reason: string;
    content_brief: string;
}

export interface SlidePlan {
    llm_model: string;
    selected_slides: SlidePlanEntry[];
}

@Entity('visualization_jobs')
export class VisualizationJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Portfolio, { nullable: false })
    portfolio: Portfolio;

    @ManyToOne(() => User, { nullable: false })
    user: User;

    @Column({ length: 50 })
    templateId: string;

    @Column({ type: 'varchar', length: 20, default: VisualizationJobStatus.PENDING })
    status: VisualizationJobStatus;

    @Column({ type: 'varchar', length: 30, default: PipelineStage.CONTENT_GENERATING })
    pipelineStage: PipelineStage;

    @Column({ default: 0 })
    totalSlides: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    gcsPptxKey: string | null;

    @Column({ type: 'jsonb', nullable: true })
    slidePlan: SlidePlan | null;

    @Column({ default: 0 })
    regenerationCount: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
