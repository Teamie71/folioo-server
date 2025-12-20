import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type LoginType = 'KAKAO' | 'NAVER' | 'GOOGLE';

@Entity({ name: 'user' })
@Index(['loginType', 'loginId'], { unique: true })
export class UserOrmEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    @Column({ type: 'enum', enum: ['KAKAO', 'NAVER', 'GOOGLE'], nullable: true })
    loginType!: LoginType | null;

    // bigint는 JS number로 깨질 수 있으니 string으로 받는 게 안전
    @Column({ type: 'bigint', nullable: true })
    loginId!: string | null;

    @Column({ type: 'int', default: 0 })
    credit!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    img_url!: string | null;

    @Column({ type: 'varchar', length: 11, nullable: true })
    phone_num!: string | null;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;
}
