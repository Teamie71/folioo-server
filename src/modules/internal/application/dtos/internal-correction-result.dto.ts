import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CorrectionRagData } from 'src/modules/portfolio-correction/domain/correction-rag-data.entity';

export class CorrectionResultItemReqDTO {
    @IsNumber()
    @ApiProperty({ description: '포트폴리오 ID' })
    portfolioId: number;

    @IsObject()
    @ApiProperty({ description: '상세정보 첨삭 결과' })
    description: Record<string, unknown>;

    @IsObject()
    @ApiProperty({ description: '담당업무 첨삭 결과' })
    responsibilities: Record<string, unknown>;

    @IsObject()
    @ApiProperty({ description: '문제해결/성과 첨삭 결과' })
    problemSolving: Record<string, unknown>;

    @IsObject()
    @ApiProperty({ description: '배운 점 첨삭 결과' })
    learnings: Record<string, unknown>;

    @IsObject()
    @ApiProperty({ description: '종합 리뷰' })
    overallReview: Record<string, unknown>;
}

export class SaveCorrectionResultReqDTO {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CorrectionResultItemReqDTO)
    @ApiProperty({ type: [CorrectionResultItemReqDTO], description: '포트폴리오별 첨삭 결과' })
    result: CorrectionResultItemReqDTO[];
}

export class CreateRagDataReqDTO {
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty({ description: '검색어' })
    searchQuery: string;

    @IsObject()
    @ApiProperty({ description: 'Tavily 검색 결과 원본' })
    searchResults: Record<string, unknown>;
}

export class RagDataResDTO {
    id: number;
    correctionId: number;
    searchQuery: string;
    searchResults: Record<string, unknown>;
    createdAt: string;

    static from(ragData: CorrectionRagData): RagDataResDTO {
        const dto = new RagDataResDTO();
        dto.id = ragData.id;
        dto.correctionId = ragData.portfolioCorrection?.id ?? 0;
        dto.searchQuery = ragData.searchQuery;
        dto.searchResults = ragData.searchResults;
        dto.createdAt = ragData.createdAt.toISOString();
        return dto;
    }
}
