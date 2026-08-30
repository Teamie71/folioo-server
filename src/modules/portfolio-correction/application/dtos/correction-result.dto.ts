import { ApiProperty } from '@nestjs/swagger';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionItem } from '../../domain/correction-item.entity';
import { CorrectionStatus } from '../../domain/enums/correction-status.enum';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}

type DescriptionPayload = JsonObject;
type ResponsibilitiesPayload = JsonObject;
type ProblemSolvingPayload = JsonObject;
type LearningsPayload = JsonObject;

export class CorrectionResultResDTO {
    @ApiProperty({
        enum: SourceType,
        description:
            '첨삭 재료 출처. internal portfolio 선택 경로가 제거되어 항상 EXTERNAL로 고정됩니다.',
    })
    portfolioSource: SourceType;

    status: CorrectionStatus;
    companyName: string;
    positionName: string;
    jobDescription: string;
    companyInsight: string | null;
    highlightPoint: string | null;
    overallReview: string | null;
    items: CorrectionItemResDTO[];

    static from(correction: PortfolioCorrection, items: CorrectionItem[]): CorrectionResultResDTO {
        const dto = new CorrectionResultResDTO();
        dto.portfolioSource = SourceType.EXTERNAL;
        dto.status = correction.status;
        dto.companyName = correction.companyName;
        dto.positionName = correction.positionName;
        dto.jobDescription = correction.jobDescription;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        dto.overallReview = correction.overallReview;
        dto.items = items.map((item) => CorrectionItemResDTO.from(item));
        return dto;
    }
}

export class CorrectionItemResDTO {
    portfolioId: number;
    description: DescriptionPayload | null;
    responsibilities: ResponsibilitiesPayload | null;
    problemSolving: ProblemSolvingPayload | null;
    learnings: LearningsPayload | null;

    static from(item: CorrectionItem): CorrectionItemResDTO {
        const dto = new CorrectionItemResDTO();
        dto.portfolioId = item.correctionMaterial.id;
        dto.description = item.description as DescriptionPayload;
        dto.responsibilities = item.responsibilities as ResponsibilitiesPayload;
        dto.problemSolving = item.problemSolving as ProblemSolvingPayload;
        dto.learnings = item.learnings as LearningsPayload;
        return dto;
    }
}
