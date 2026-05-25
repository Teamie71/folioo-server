import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { VisualizationSlideStatus } from './enums/visualization-slide-status.enum';
import { VisualizationJob } from './visualization-job.entity';

interface TextFill {
    role: string;
    action: 'text';
    text: string;
    font_size_override: number | null;
    is_title: boolean;
}

interface ChartFill {
    role: string;
    action: 'chart';
    chart_type: string;
    data: Record<string, unknown>;
}

interface RemoveFill {
    role: string;
    action: 'remove';
}

export type FillAction = TextFill | ChartFill | RemoveFill;
export type CurrentFills = Record<string, FillAction>;

@Entity('visualization_slides')
@Unique(['job', 'slideOrder'])
export class VisualizationSlide {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => VisualizationJob, { nullable: false, onDelete: 'CASCADE' })
    job: VisualizationJob;

    @Column()
    slideOrder: number;

    @Column({ length: 50 })
    sourceSlideId: string;

    @Column({ length: 50 })
    slideFilename: string;

    @Column({ type: 'varchar', length: 20, default: VisualizationSlideStatus.PENDING })
    status: VisualizationSlideStatus;

    @Column({ type: 'jsonb', nullable: true })
    currentFills: CurrentFills | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    gcsPreviewKey: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
