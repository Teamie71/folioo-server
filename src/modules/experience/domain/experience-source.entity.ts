import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Experience } from './experience.entity';

@Entity()
export class ExperienceSource extends BaseEntity {
    //NOTE: 필요하다면 원본 파일 저장

    @Column({
        type: 'text',
        nullable: true,
    })
    extractedText: string;

    @Column({
        type: 'jsonb',
        nullable: true,
    })
    ocrMetaData: Record<string, any>;

    @ManyToOne(() => Experience, {
        onDelete: 'CASCADE',
    })
    experience: Experience;
}
