import { BaseEntity } from '../../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { TicketType } from '../../../ticket/domain/enums/ticket-type.enum';

export interface RewardConfigItem {
    type: TicketType;
    quantity: number;
}

export interface GoalConfig {
    target: number;
    dailyLimit?: number;
}

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
    rewardConfig: RewardConfigItem[];

    @Column({ type: 'jsonb', nullable: true })
    goalConfig: GoalConfig | null;

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
