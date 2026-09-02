import { ApiProperty } from '@nestjs/swagger';
import { JobSearchSession } from '../../domain/job-search-session.entity';

export class JobSearchStatusResDTO {
    @ApiProperty({ description: '이 계정으로 완료한 직무 찾기 결과가 있는지 여부' })
    hasCompleted: boolean;

    @ApiProperty({
        required: false,
        nullable: true,
        description: '가장 최근에 완료한 결과의 토큰(공유/조회용). 없으면 null',
    })
    token: string | null;

    static from(session: JobSearchSession | null): JobSearchStatusResDTO {
        const dto = new JobSearchStatusResDTO();
        dto.hasCompleted = session !== null;
        dto.token = session?.id ?? null;
        return dto;
    }
}

export class JobSearchResultResDTO {
    @ApiProperty({ description: '직무 찾기 결과 (내용은 결과 산출 로직에 따라 결정)' })
    result: Record<string, unknown>;

    @ApiProperty({ description: '결과 조회 가능 마감 시각(ISO 8601)' })
    expiresAt: string | null;

    static from(session: JobSearchSession): JobSearchResultResDTO {
        const dto = new JobSearchResultResDTO();
        dto.result = session.result ?? {};
        dto.expiresAt = session.resultExpiresAt?.toISOString() ?? null;
        return dto;
    }
}
