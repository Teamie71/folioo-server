export class CorrectionResultResDTO {
    companyName: string;
    positionName: string;
    jobDescription: string;
    companyInsight: string;
    highlightPoint: string;
    items: CorrectionItemResDTO[];
}

export class CorrectionItemResDTO {
    portfolioId: number;
    overallReview: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
}
