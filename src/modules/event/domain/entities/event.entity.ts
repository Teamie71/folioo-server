import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('event')
export class Event extends BaseEntity {
    @Column({ unique: true, length: 50 })
    code: string;

    @Column({ length: 100 })
    title: string;

    @Column({ length: 500 })
    description: string;

    @Column({ length: 50 })
    ctaText: string;

    @Column({ length: 255, nullable: true })
    ctaLink: string;

    @Column({ type: 'jsonb' })
    rewardConfig: Record<string, unknown>;

    @Column({ type: 'jsonb', nullable: true })
    goalConfig: Record<string, unknown>;

    @Column({ type: 'date' })
    startDate: Date;

    @Column({ type: 'date', nullable: true })
    endDate: Date;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 1 })
    maxParticipation: number;

    @Column({ default: 0 })
    displayOrder: number;
}
