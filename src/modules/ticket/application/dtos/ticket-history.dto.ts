import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketStatus } from '../../domain/enums/ticket-status.enum';
import { TicketSource } from '../../domain/enums/ticket-source.enum';

export class TicketHistoryItemResDTO {
    @ApiProperty({ example: 1 })
    ticketId: number;

    @ApiProperty({ enum: TicketType, example: TicketType.EXPERIENCE })
    type: TicketType;

    @ApiProperty({ enum: TicketStatus, example: TicketStatus.AVAILABLE })
    status: TicketStatus;

    @ApiProperty({ enum: TicketSource, example: TicketSource.PURCHASE })
    source: TicketSource;

    @ApiProperty({ example: '2026-03-08T00:00:00.000Z' })
    createdAt: string;

    @ApiPropertyOptional({ example: null, nullable: true })
    usedAt: string | null;

    @ApiPropertyOptional({ example: null, nullable: true })
    expiredAt: string | null;
}

export class TicketHistoryResDTO {
    @ApiProperty({ type: [TicketHistoryItemResDTO] })
    history: TicketHistoryItemResDTO[];

    @ApiProperty({ example: 5 })
    total: number;

    static from(history: TicketHistoryItemResDTO[]): TicketHistoryResDTO {
        const dto = new TicketHistoryResDTO();
        dto.history = history;
        dto.total = history.length;
        return dto;
    }
}
