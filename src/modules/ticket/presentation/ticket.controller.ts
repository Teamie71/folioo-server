import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonResponseArray } from 'src/common/decorators/swagger.decorator';
import { TicketProductResDTO } from '../application/dtos/ticket-product.dto';
import { TicketProductService } from '../application/services/ticket-product.service';

@ApiTags('Ticket')
@Controller('ticket-products')
export class TicketController {
    constructor(private readonly ticketProductService: TicketProductService) {}

    @Get()
    @Public()
    @ApiOperation({
        summary: '이용권 상품 목록 조회',
        description:
            '활성화된 이용권 상품 목록을 displayOrder 기준 오름차순으로 조회합니다. 할인율(discountRate)은 정가 대비 판매가로 계산됩니다.',
    })
    @ApiCommonResponseArray(TicketProductResDTO)
    async getTicketProducts(): Promise<TicketProductResDTO[]> {
        return this.ticketProductService.findActiveProducts();
    }
}
