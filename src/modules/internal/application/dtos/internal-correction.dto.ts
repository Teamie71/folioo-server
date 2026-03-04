import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CorrectionStatus } from 'src/modules/portfolio-correction/domain/enums/correction-status.enum';
import { CorrectionItem } from 'src/modules/portfolio-correction/domain/correction-item.entity';
import { InternalCorrectionPayload } from 'src/modules/portfolio-correction/application/services/portfolio-correction.service';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject {
    [key: string]: JsonValue;
}

class InternalCorrectionItemResDTO {
    portfolio_id: number;
    description: JsonObject | null;
    responsibilities: JsonObject | null;
    problem_solving: JsonObject | null;
    learnings: JsonObject | null;
    overall_review: JsonObject | null;

    static from(item: CorrectionItem): InternalCorrectionItemResDTO {
        const dto = new InternalCorrectionItemResDTO();
        dto.portfolio_id = item.portfolio.id;
        dto.description = (item.description as JsonObject) ?? null;
        dto.responsibilities = (item.responsibilities as JsonObject) ?? null;
        dto.problem_solving = (item.problemSolving as JsonObject) ?? null;
        dto.learnings = (item.learnings as JsonObject) ?? null;
        dto.overall_review = (item.overallReview as JsonObject) ?? null;
        return dto;
    }
}

export class InternalCorrectionResDTO {
    id: number;

    @ApiProperty({ description: '연관된 사용자 ID' })
    user_id: number;

    @ApiProperty({ description: '선택된 포트폴리오 ID 목록', type: [Number] })
    portfolio_ids: number[];

    company_name: string;

    @ApiProperty({ description: '직무명' })
    job_title: string;

    @ApiProperty({ description: '직무 설명(JD)' })
    job_description: string;

    @ApiProperty({ description: '사용자가 입력한 강조 포인트', nullable: true })
    emphasis_points: string | null;

    @ApiProperty({ description: 'RAG 파이프라인이 생성한 기업 분석', nullable: true })
    company_insight: string | null;

    @ApiProperty({ enum: CorrectionStatus })
    status: CorrectionStatus;

    @ApiProperty({ description: '첨삭 생성 결과 (완료 시 배열, 미완료 시 null)', nullable: true })
    result: InternalCorrectionItemResDTO[] | null;

    static from(payload: InternalCorrectionPayload): InternalCorrectionResDTO {
        const { correction, portfolioIds, items } = payload;
        const dto = new InternalCorrectionResDTO();
        dto.id = correction.id;
        dto.user_id = correction.user?.id ?? 0;
        dto.portfolio_ids = portfolioIds;
        dto.company_name = correction.companyName;
        dto.job_title = correction.positionName;
        dto.job_description = correction.jobDescription;
        dto.emphasis_points = correction.highlightPoint ?? null;
        dto.company_insight = correction.companyInsight ?? null;
        dto.status = correction.status;
        dto.result =
            items.length > 0 ? items.map((item) => InternalCorrectionItemResDTO.from(item)) : null;
        return dto;
    }
}

export class UpdateCorrectionStatusReqDTO {
    @IsEnum(CorrectionStatus)
    @ApiProperty({ enum: CorrectionStatus, description: '변경할 상태값' })
    status: CorrectionStatus;
}

export class UpdateCompanyInsightInternalReqDTO {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1500)
    @ApiProperty({ description: 'RAG로 생성된 기업 분석 텍스트' })
    company_insight: string;
}
