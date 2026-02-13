import { ApiProperty } from '@nestjs/swagger';

class ExpiringTicketTypeResDTO {
    @ApiProperty({ example: 2, description: '만료 예정 이용권 수량' })
    count: number;

    @ApiProperty({
        example: '2026-03-01T00:00:00.000Z',
        description: '가장 빨리 만료되는 이용권의 만료일',
        nullable: true,
    })
    earliestExpiredAt: Date | null;
}

export class TicketExpiringResDTO {
    @ApiProperty({ description: '경험 정리 이용권 만료 예정 정보' })
    experience: ExpiringTicketTypeResDTO;

    @ApiProperty({ description: '포트폴리오 첨삭 이용권 만료 예정 정보' })
    portfolioCorrection: ExpiringTicketTypeResDTO;

    static from(
        experienceCount: number,
        experienceEarliestExpiredAt: Date | null,
        correctionCount: number,
        correctionEarliestExpiredAt: Date | null
    ): TicketExpiringResDTO {
        const dto = new TicketExpiringResDTO();

        const experience = new ExpiringTicketTypeResDTO();
        experience.count = experienceCount;
        experience.earliestExpiredAt = experienceEarliestExpiredAt;
        dto.experience = experience;

        const correction = new ExpiringTicketTypeResDTO();
        correction.count = correctionCount;
        correction.earliestExpiredAt = correctionEarliestExpiredAt;
        dto.portfolioCorrection = correction;

        return dto;
    }
}
