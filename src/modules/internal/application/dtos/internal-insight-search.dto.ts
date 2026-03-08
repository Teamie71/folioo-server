import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { InternalInsightDetailResDTO } from './internal-insight.dto';

export class InternalInsightSearchQueryDTO {
    @ApiProperty({ description: '조회 대상 사용자 ID', example: 1024 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    userId: number;

    @ApiProperty({ description: '검색 키워드', example: '소통' })
    @IsString()
    @IsNotEmpty()
    keyword: string;

    @ApiPropertyOptional({
        description: '코사인 유사도 임계값 (0~1, 높을수록 더 유사한 결과만 허용)',
        example: 0.6,
        default: 0.6,
    })
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    threshold?: number;

    @ApiPropertyOptional({ description: '최대 반환 개수 (1~20)', example: 5, default: 5 })
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    topK?: number;
}

export class InternalInsightSearchResDTO {
    @ApiProperty({ type: [InternalInsightDetailResDTO] })
    insights: InternalInsightDetailResDTO[];

    static from(logs: InternalInsightDetailResDTO[]): InternalInsightSearchResDTO {
        const dto = new InternalInsightSearchResDTO();
        dto.insights = logs;
        return dto;
    }
}
