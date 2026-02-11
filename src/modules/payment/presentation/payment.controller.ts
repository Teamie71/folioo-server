import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../application/services/payment.service';

@ApiTags('Payment')
@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}
}
