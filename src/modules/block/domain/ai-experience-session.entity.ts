import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/domain/user.entity';

@Entity('ai_experience_session')
export class AiExperienceSession {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'session_id', type: 'uuid', unique: true })
    sessionId: string;

    @Column({ name: 'active_gap', type: 'jsonb', nullable: true })
    activeGap: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
