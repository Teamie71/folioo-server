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
            // DB에 저장된 값은 KST wall-clock이므로 Asia/Seoul 기준으로 파싱
            return DateTime.fromSQL(value, { zone: 'Asia/Seoul' }).toJSDate();
        }
        // pg가 Date 객체로 전달하는 경우: UTC 컴포넌트가 실제로는 KST wall-clock 값
        // getSeoulNow()가 Date.UTC(kst.hour, ...) 트릭으로 저장했으므로 역변환
        const asUtc = DateTime.fromJSDate(value, { zone: 'UTC' });
        return DateTime.fromObject(
            {
                year: asUtc.year,
                month: asUtc.month,
                day: asUtc.day,
                hour: asUtc.hour,
                minute: asUtc.minute,
                second: asUtc.second,
                millisecond: asUtc.millisecond,
            },
            { zone: 'Asia/Seoul' }
        ).toJSDate();
    },
};

export abstract class BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', transformer: seoulTimestampTransformer, update: false })
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
