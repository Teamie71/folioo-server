import { Portfolio } from 'src/modules/portfolio/domain/portfolio.entity';
import { PortfolioStatus } from 'src/modules/portfolio/domain/enums/portfolio-status.enum';
import { IsString, IsEnum, ValidateIf, IsNotEmpty } from 'class-validator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

export class InternalPortfolioDetailResDTO {
    id: number;
    sessionId: string | null;
    userId: number;
    experienceName: string;
    status: PortfolioStatus;
    description: string;
    responsibilities: string;
    problemSolving: string;
    learnings: string;
    contributionRate: number | null;

    static from(portfolio: Portfolio): InternalPortfolioDetailResDTO {
        if (!portfolio.user) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const dto = new InternalPortfolioDetailResDTO();
        dto.id = portfolio.id;
        dto.sessionId = portfolio.experience?.sessionId ?? null;
        dto.userId = portfolio.user.id;
        dto.experienceName = portfolio.experience?.name ?? portfolio.name;
        dto.status = portfolio.status;
        dto.description = portfolio.description;
        dto.responsibilities = portfolio.responsibilities;
        dto.problemSolving = portfolio.problemSolving;
        dto.learnings = portfolio.learnings;
        dto.contributionRate = portfolio.contributionRate ?? null;
        return dto;
    }
}

export enum PortfolioGenerationStatus {
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export class UpdatePortfolioResultReqDTO {
    @IsEnum(PortfolioGenerationStatus)
    status: PortfolioGenerationStatus;

    @ValidateIf(
        (o: UpdatePortfolioResultReqDTO) => o.status === PortfolioGenerationStatus.COMPLETED
    )
    @IsString()
    @IsNotEmpty()
    description?: string;

    @ValidateIf(
        (o: UpdatePortfolioResultReqDTO) => o.status === PortfolioGenerationStatus.COMPLETED
    )
    @IsString()
    @IsNotEmpty()
    responsibilities?: string;

    @ValidateIf(
        (o: UpdatePortfolioResultReqDTO) => o.status === PortfolioGenerationStatus.COMPLETED
    )
    @IsString()
    @IsNotEmpty()
    problemSolving?: string;

    @ValidateIf(
        (o: UpdatePortfolioResultReqDTO) => o.status === PortfolioGenerationStatus.COMPLETED
    )
    @IsString()
    @IsNotEmpty()
    learnings?: string;

    @ValidateIf((o: UpdatePortfolioResultReqDTO) => o.status === PortfolioGenerationStatus.FAILED)
    @IsString()
    errorMessage?: string;
}
