import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { LoginType } from './enums/login-type.enum';

@Entity()
export class User extends BaseEntity {
    @Column({ length: 10 })
    name: string;

    @Column({
        unique: true,
        length: 255,
    })
    email: string;

    @Column({ length: 255 })
    imgUrl: string;

    @Column({
        unique: true,
        nullable: true,
        length: 11,
    })
    phoneNum: string;

    @Column({
        type: 'bigint',
    })
    loginId: string;

    @Column({
        type: 'enum',
        enum: LoginType,
    })
    loginType: LoginType;

    @Column({ default: 0 })
    credit: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    deactivatedAt: Date;
}
