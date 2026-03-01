import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { LoginType } from './enums/login-type.enum';

@Entity('users')
export class User extends BaseEntity {
    @Column({ length: 10 })
    name: string;

    @Column({
        unique: true,
        length: 255,
    })
    email: string;

    @Column({
        unique: true,
        nullable: true,
        length: 11,
    })
    phoneNum: string;

    @Column({
        type: 'varchar',
        length: 255,
    })
    socialId: string;

    @Column({
        type: 'enum',
        enum: LoginType,
    })
    socialType: LoginType;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    deactivatedAt: Date;

    static createSocialUser(
        name: string,
        email: string,
        socialId: string,
        socialType: LoginType
    ): User {
        const user = new User();
        user.name = name;
        user.email = email;
        user.socialId = socialId;
        user.socialType = socialType;
        return user;
    }
}
