import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class IssueTicketReqDTO {
    @IsOptional()
    @IsUUID()
    @ApiProperty({
        required: false,
        description:
            '재시도 시 실패한 요청의 request_id를 그대로 전달하면 새 UUID를 생성하지 않고 재사용합니다.',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    request_id?: string;
}

export class IssueTicketResDTO {
    @ApiProperty({ description: 'HS256으로 서명된 티켓. sub/sid/iat/exp를 담는다.' })
    ticket: string;

    @ApiProperty({ description: '사용자의 AI 경험 정리 세션 id' })
    session_id: string;

    @ApiProperty({ description: '이번 턴의 request_id. 커밋 시 그대로 사용된다.' })
    request_id: string;

    @ApiProperty({ description: '티켓 만료까지 남은 초' })
    expires_in: number;

    static from(
        ticket: string,
        sessionId: string,
        requestId: string,
        expiresIn: number
    ): IssueTicketResDTO {
        const dto = new IssueTicketResDTO();
        dto.ticket = ticket;
        dto.session_id = sessionId;
        dto.request_id = requestId;
        dto.expires_in = expiresIn;
        return dto;
    }
}
