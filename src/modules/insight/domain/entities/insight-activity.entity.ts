import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Insight } from './insight.entity';
import { Activity } from './activity.entity';

@Entity()
export class InsightActivity extends BaseEntity {
    @ManyToOne(() => Insight)
    @JoinColumn({ name: 'insight_id' })
    insight: Insight;

    @ManyToOne(() => Activity)
    @JoinColumn({ name: 'activity_id' })
    activity: Activity;
}
