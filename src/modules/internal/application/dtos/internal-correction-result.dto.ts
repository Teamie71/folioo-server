import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CorrectionRagData } from 'src/modules/portfolio-correction/domain/correction-rag-data.entity';

export class CorrectionLineItemReqDTO {
    @IsNumber()
    @ApiProperty({ description: '줄 번호 (1-indexed)' })
    lineNumber: number;

    @IsString()
    @ApiProperty({ description: '원본 텍스트' })
    originalText: string;

    @IsString()
    @ApiProperty({ description: '첨삭 유형 (keep / reduce / emphasize 등)' })
    type: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description: '첨삭 코멘트. type이 keep이면 null',
        nullable: true,
    })
    comment: string | null;
}

export class CorrectionFieldReqDTO {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CorrectionLineItemReqDTO)
    @ApiProperty({ type: [CorrectionLineItemReqDTO], description: '라인별 첨삭 결과' })
    lines: CorrectionLineItemReqDTO[];
}

export class CorrectionResultItemReqDTO {
    @IsNumber()
    @ApiProperty({ description: '포트폴리오 ID' })
    portfolioId: number;

    @ValidateNested()
    @Type(() => CorrectionFieldReqDTO)
    @ApiProperty({ type: CorrectionFieldReqDTO, description: '상세정보 첨삭 결과' })
    description: CorrectionFieldReqDTO;

    @ValidateNested()
    @Type(() => CorrectionFieldReqDTO)
    @ApiProperty({ type: CorrectionFieldReqDTO, description: '담당업무 첨삭 결과' })
    responsibilities: CorrectionFieldReqDTO;

    @ValidateNested()
    @Type(() => CorrectionFieldReqDTO)
    @ApiProperty({ type: CorrectionFieldReqDTO, description: '문제해결/성과 첨삭 결과' })
    problemSolving: CorrectionFieldReqDTO;

    @ValidateNested()
    @Type(() => CorrectionFieldReqDTO)
    @ApiProperty({ type: CorrectionFieldReqDTO, description: '배운 점 첨삭 결과' })
    learnings: CorrectionFieldReqDTO;
}

export class SaveCorrectionResultReqDTO {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CorrectionResultItemReqDTO)
    @ApiProperty({ type: [CorrectionResultItemReqDTO], description: '포트폴리오별 첨삭 결과' })
    result: CorrectionResultItemReqDTO[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty({ description: '전체 포트폴리오 총평' })
    overallReview: string;
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

    static from(ragData: CorrectionRagData, correctionId: number): RagDataResDTO {
        const dto = new RagDataResDTO();
        dto.id = ragData.id;
        dto.correctionId = correctionId;
        dto.searchQuery = ragData.searchQuery;
        dto.searchResults = ragData.searchResults;
        dto.createdAt = ragData.createdAt.toISOString();
        return dto;
    }
}
