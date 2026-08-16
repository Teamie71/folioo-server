import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/domain/user.entity';

@Entity('ai_commit_log')
export class AiCommitLog {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'request_id', type: 'uuid' })
    requestId: string;

    @Column({ name: 'previous_version', type: 'bigint' })
    previousVersion: string;

    @Column({ name: 'committed_version', type: 'bigint' })
    committedVersion: string;

    @Column({ name: 'created_block_ids', type: 'bigint', array: true })
    createdBlockIds: string[];

    @Column({ name: 'updated_blocks', type: 'jsonb', nullable: true })
    updatedBlocks: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;
}
