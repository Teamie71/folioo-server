import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';
import { CorrectionItem } from '../../domain/correction-item.entity';

export class CorrectionResultResDTO {
    companyName: string;
    positionName: string;
    jobDescription: string;
    companyInsight: string;
    highlightPoint: string;
    items: CorrectionItemResDTO[];

    static from(correction: PortfolioCorrection, items: CorrectionItem[]): CorrectionResultResDTO {
        const dto = new CorrectionResultResDTO();
        dto.companyName = correction.companyName;
        dto.positionName = correction.positionName;
        dto.jobDescription = correction.jobDescription;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        dto.items = items.map((item) => CorrectionItemResDTO.from(item));
        return dto;
    }
}

export class CorrectionItemResDTO {
    portfolioId: number;
    overallReview: Record<string, unknown>;
    description: Record<string, unknown>;
    responsibilities: Record<string, unknown>;
    problemSolving: Record<string, unknown>;
    learnings: Record<string, unknown>;

    static from(item: CorrectionItem): CorrectionItemResDTO {
        const dto = new CorrectionItemResDTO();
        dto.portfolioId = item.portfolio.id;
        dto.overallReview = item.overallReview;
        dto.description = item.description;
        dto.responsibilities = item.responsibilities;
        dto.problemSolving = item.problemSolving;
        dto.learnings = item.learnings;
        return dto;
    }
}
