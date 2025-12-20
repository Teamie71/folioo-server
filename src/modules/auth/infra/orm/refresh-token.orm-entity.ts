import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'refresh_token' })
@Index(['userId'], { unique: true })
export class RefreshTokenOrmEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int' })
    userId!: number;

    @Column({ type: 'text' })
    refreshToken!: string;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;
}
