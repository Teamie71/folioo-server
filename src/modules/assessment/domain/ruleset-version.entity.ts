import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ruleset_versions')
export class RulesetVersion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    version: string;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @Column({ type: 'timestamptz', name: 'activated_at', nullable: true })
    activatedAt: Date | null;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;
}
