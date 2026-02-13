import { ApiProperty } from '@nestjs/swagger';

class TicketTypeBalanceResDTO {
    @ApiProperty({ example: 3, description: '사용 가능한 이용권 수량' })
    count: number;
}

export class TicketBalanceResDTO {
    @ApiProperty({ description: '경험 정리 이용권 잔여 수량' })
    experience: TicketTypeBalanceResDTO;

    @ApiProperty({ description: '포트폴리오 첨삭 이용권 잔여 수량' })
    portfolioCorrection: TicketTypeBalanceResDTO;

    static from(experienceCount: number, portfolioCorrectionCount: number): TicketBalanceResDTO {
        const dto = new TicketBalanceResDTO();

        const experience = new TicketTypeBalanceResDTO();
        experience.count = experienceCount;
        dto.experience = experience;

        const portfolioCorrection = new TicketTypeBalanceResDTO();
        portfolioCorrection.count = portfolioCorrectionCount;
        dto.portfolioCorrection = portfolioCorrection;

        return dto;
    }
}
