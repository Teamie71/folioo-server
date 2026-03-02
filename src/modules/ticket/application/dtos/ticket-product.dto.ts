import { ApiProperty } from '@nestjs/swagger';
import { TicketType } from '../../domain/enums/ticket-type.enum';
import { TicketProduct } from '../../domain/entities/ticket-product.entity';

export class TicketProductResDTO {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ enum: TicketType, example: TicketType.EXPERIENCE })
    type: TicketType;

    @ApiProperty({ example: 3, description: '이용권 수량 (1/3/5회권)' })
    quantity: number;

    @ApiProperty({ example: 8900, description: '판매가 (원)' })
    price: number;

    @ApiProperty({
        example: 12000,
        description: '정가 (원)',
        nullable: true,
    })
    originalPrice: number | null;

    @ApiProperty({
        example: 26,
        description: '할인율 (%). originalPrice가 없으면 0',
    })
    discountRate: number;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: 1, description: '노출 순서 (오름차순)' })
    displayOrder: number;

    static from(entity: TicketProduct): TicketProductResDTO {
        const dto = new TicketProductResDTO();
        dto.id = entity.id;
        dto.type = entity.type;
        dto.quantity = entity.quantity;
        dto.price = entity.price;
        dto.originalPrice = entity.originalPrice ?? null;
        dto.discountRate = TicketProductResDTO.calculateDiscountRate(
            entity.originalPrice,
            entity.price
        );
        dto.isActive = entity.isActive;
        dto.displayOrder = entity.displayOrder;
        return dto;
    }

    private static calculateDiscountRate(
        originalPrice: number | undefined | null,
        price: number
    ): number {
        if (!originalPrice || originalPrice <= price) {
            return 0;
        }
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }
}
