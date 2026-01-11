import { BaseEntity } from '../../../common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { CorrectionStatus } from './enums/correction-status.enum';

@Entity()
export class PortfolioCorrection extends BaseEntity {
    @Column({ length: 20 })
    title: string;

    @Column({ length: 20 })
    companyName: string;

    @Column({ length: 20 })
    positionName: string;

    @Column({ length: 700 })
    jobDescription: string;

    @Column({ length: 1500, nullable: true })
    companyInsight: string;

    @Column({ length: 200, nullable: true })
    highlightPoint: string;

    @Column({
        type: 'enum',
        enum: CorrectionStatus,
        default: CorrectionStatus.NOT_STARTED,
    })
    status: CorrectionStatus;
}
