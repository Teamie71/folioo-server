export class UpdateCompanyInsightReqDTO {
    companyInsight?: string;
    highlightPoint?: string;
}

export class UpdateCompanyInsightResDTO {
    id: number;
    companyInsight: string;
    highlightPoint: string;
}
