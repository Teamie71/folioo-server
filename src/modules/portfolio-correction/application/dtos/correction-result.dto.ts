export class CorrectionResultResDto {
    companyName: string;
    positionName: string;
    jobDescription: string;
    companyInsight: string;
    highlightPoint: string;
    items: CorrectionItemResDto[];
}

export class CorrectionItemResDto {
    portfolioId: number;
    overallReview: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
}
