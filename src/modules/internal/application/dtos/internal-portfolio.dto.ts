import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PortfolioStatus } from 'src/modules/portfolio/domain/enums/portfolio-status.enum';

export class InternalPortfolioDetailResDTO {
    id: number;
    sessionId: string;
    userId: number;
    experienceName: string;
    status: PortfolioStatus;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number | null;

    static from(portfolio: Portfolio): InternalPortfolioDetailResDTO {
        const dto = new InternalPortfolioDetailResDTO();
        dto.id = portfolio.id;
        dto.sessionId = portfolio.experience?.sessionId ?? '';
        dto.userId = portfolio.user?.id ?? 0;
        dto.experienceName = portfolio.experience?.name ?? '';
        dto.status = portfolio.status;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        dto.contributionRate = portfolio.contributionRate ?? null;
        return dto;
    }
}
