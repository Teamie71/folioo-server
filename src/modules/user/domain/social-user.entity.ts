import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { LoginType } from './enums/login-type.enum';

@Entity('social_user')
@Index(['userId'])
@Index(['loginType', 'loginId'])
export class SocialUser extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        type: 'enum',
        enum: LoginType,
        name: 'login_type',
    })
    loginType: LoginType;

    @Column({ length: 255, name: 'login_id' })
    loginId: string;

    @Column({ length: 255 })
    email: string;

    static create(
        userId: number,
        loginType: LoginType,
        loginId: string,
        email: string
    ): SocialUser {
        const socialUser = new SocialUser();
        socialUser.userId = userId;
        socialUser.loginType = loginType;
        socialUser.loginId = loginId;
        socialUser.email = email;
        return socialUser;
    }
}
