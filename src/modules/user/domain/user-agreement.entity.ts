import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { TermType } from './enums/term-type.enum';

@Entity('user_agreement')
@Index(['userId'])
export class UserAgreement extends BaseEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        type: 'enum',
        enum: TermType,
        name: 'term_type',
    })
    termType: TermType;

    @Column({ length: 10 })
    version: string;

    @Column({ name: 'is_agree' })
    isAgree: boolean;

    @Column({ name: 'agree_at', nullable: true })
    agreeAt: Date | null;

    static createMarketingAgreement(
        userId: number,
        version: string,
        isMarketingAgreed: boolean,
        agreedAt: Date | null
    ): UserAgreement {
        const agreement = new UserAgreement();
        agreement.userId = userId;
        agreement.termType = TermType.MARKETING;
        agreement.version = version;
        agreement.isAgree = isMarketingAgreed;
        agreement.agreeAt = agreedAt;
        return agreement;
    }
}
