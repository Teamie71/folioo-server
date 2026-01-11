export class StructuredPortfolioResDTO {
    portfolioId: number;
    name: string;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
}

export class CreateExternalPortfolioReqDTO {
    correctionId: number;
}

export class UpdatePortfolioBlockReqDTO {
    name?: string;
    description?: string;
    responsibilities?: string;
    problemSolving?: string;
    learnings?: string;
}
