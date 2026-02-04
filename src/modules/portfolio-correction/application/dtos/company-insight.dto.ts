export class UpdateCompanyInsightReqDto {
    companyInsight?: string;
    highlightPoint?: string;
}

export class UpdateCompanyInsightResDto {
    id: number;
    companyInsight: string;
    highlightPoint: string;
}
