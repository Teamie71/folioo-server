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
