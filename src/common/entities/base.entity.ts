import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    PrimaryGeneratedColumn,
    ValueTransformer,
} from 'typeorm';
import { DateTime } from 'luxon';
import { getSeoulNow } from '../utils/seoul-date.util';

const seoulTimestampTransformer: ValueTransformer = {
    to: (value: Date | undefined): Date | undefined => value,
    from: (value: Date | string | undefined): Date | undefined => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === 'string') {
            return DateTime.fromSQL(value, { zone: 'UTC' }).toJSDate();
        }
        return value;
    },
};

export abstract class BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', transformer: seoulTimestampTransformer })
    createdAt: Date;

    @Column({ type: 'timestamp', transformer: seoulTimestampTransformer })
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
