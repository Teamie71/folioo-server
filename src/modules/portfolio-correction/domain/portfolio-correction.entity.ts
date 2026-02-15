import { BaseEntity } from '../../../common/entities/base.entity';
import { JobDescriptionType } from './enums/jobdescription-type.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { CorrectionStatus } from './enums/correction-status.enum';

export const MAX_CORRECTIONS_PER_USER = 15;

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

    @Column({
        type: 'enum',
        enum: JobDescriptionType,
        default: JobDescriptionType.TEXT,
    })
    jobDescriptionType: JobDescriptionType;

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

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    static create(
        userId: number,
        companyName: string,
        positionName: string,
        jobDescription: string,
        jobDescriptionType: JobDescriptionType
    ): PortfolioCorrection {
        const correction = new PortfolioCorrection();
        correction.user = { id: userId } as User;
        correction.companyName = companyName;
        correction.positionName = positionName;
        correction.jobDescription = jobDescription;
        correction.jobDescriptionType = jobDescriptionType;

        const initialTitle = `${companyName} ${positionName}`.trim();
        correction.title = initialTitle.length > 20 ? initialTitle.slice(0, 20) : initialTitle;

        return correction;
    }
}
