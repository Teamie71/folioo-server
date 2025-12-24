import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { ChatStatus } from './enums/chat-status.enum';
import { Experience } from './experience.entity';

@Entity()
export class ExperienceChat extends BaseEntity {
    @Column({ type: 'jsonb' })
    chat: Record<string, any>; //NOTE: 대화 json 형식이 구체화 되면 타입을 interface로 정의할 예정

    @Column({
        type: 'enum',
        enum: ChatStatus,
        default: ChatStatus.STEP1,
    })
    status: ChatStatus;

    @OneToOne(() => Experience)
    @JoinColumn()
    experience: Experience;
}
