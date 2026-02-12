import { PortfolioCorrection } from '../../domain/portfolio-correction.entity';

export class UpdateCompanyInsightReqDTO {
    companyInsight?: string;
    highlightPoint?: string;
}

export class UpdateCompanyInsightResDTO {
    id: number;
    companyInsight: string;
    highlightPoint: string;

    static from(correction: PortfolioCorrection): UpdateCompanyInsightResDTO {
        const dto = new UpdateCompanyInsightResDTO();
        dto.id = correction.id;
        dto.companyInsight = correction.companyInsight;
        dto.highlightPoint = correction.highlightPoint;
        return dto;
    }
}
