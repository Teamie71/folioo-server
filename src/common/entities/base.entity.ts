import { BeforeInsert, BeforeUpdate, Column, PrimaryGeneratedColumn } from 'typeorm';
import { getSeoulNow } from '../utils/seoul-date.util';

export abstract class BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp' })
    createdAt: Date;

    @Column({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeInsert()
    protected setTimestampsOnInsert(): void {
        const now = getSeoulNow();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @BeforeUpdate()
    protected setTimestampsOnUpdate(): void {
        this.updatedAt = getSeoulNow();
    }
}
