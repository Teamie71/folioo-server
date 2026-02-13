import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { PaymentFacade } from '../application/facades/payment.facade';
import { PaymentService } from '../application/services/payment.service';
import { CreatePaymentReqDTO, PaymentResDTO } from '../application/dtos/payment.dto';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
    constructor(
        private readonly paymentFacade: PaymentFacade,
        private readonly paymentService: PaymentService
    ) {}

    @Post()
    @ApiOperation({
        summary: '결제 요청 생성',
        description: '티켓 상품 ID를 전달하면 결제 요청을 생성하고 REQUESTED 상태로 저장합니다.',
    })
    @ApiCommonResponse(PaymentResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.TICKET_PRODUCT_NOT_FOUND)
    async createPayment(
        @User('sub') userId: number,
        @Body() body: CreatePaymentReqDTO
    ): Promise<PaymentResDTO> {
        const payment = await this.paymentFacade.createPayment(userId, body.ticketProductId);
        return PaymentResDTO.from(payment);
    }

    @Get(':paymentId')
    @ApiOperation({
        summary: '결제 상태 조회',
        description:
            '결제 복귀/새로고침 시 현재 결제 상태를 조회합니다. 본인의 결제만 조회할 수 있습니다.',
    })
    @ApiCommonResponse(PaymentResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.PAYMENT_NOT_FOUND,
        ErrorCode.PAYMENT_NOT_OWNER
    )
    async getPayment(
        @User('sub') userId: number,
        @Param('paymentId', ParseIntPipe) paymentId: number
    ): Promise<PaymentResDTO> {
        const payment = await this.paymentService.findByIdAndUserIdOrThrow(paymentId, userId);
        return PaymentResDTO.from(payment);
    }
}
