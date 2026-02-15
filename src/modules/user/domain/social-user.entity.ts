import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { LoginType } from './enums/login-type.enum';

@Entity('social_user')
@Index(['userId'])
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
}
