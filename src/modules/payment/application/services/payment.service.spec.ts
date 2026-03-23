import { PaymentService } from './payment.service';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { Payment } from '../../domain/entities/payment.entity';
import { PaymentStatus } from '../../domain/enums/payment-status.enum';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const mockRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIdAndUserId: jest.fn(),
    existsById: jest.fn(),
    existsByMulNo: jest.fn(),
    findByMulNo: jest.fn(),
    updatePaidIfRequested: jest.fn(),
};

function makePayment(overrides: Partial<Payment> = {}): Payment {
    const p = new Payment();
    Object.assign(p, {
        id: 1,
        userId: 1,
        ticketProductId: 1,
        mulNo: 1700000000,
        amount: 10000,
        status: PaymentStatus.REQUESTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });
    return p;
}

describe('PaymentService', () => {
    let service: PaymentService;

    beforeEach(() => {
        jest.resetAllMocks();
        service = new PaymentService(mockRepository as unknown as PaymentRepository);
    });

    describe('findByIdOrThrow', () => {
        it('payment이 없으면 PAYMENT_NOT_FOUND throw', async () => {
            mockRepository.findById.mockResolvedValue(null);

            try {
                await service.findByIdOrThrow(999);
                fail('BusinessException should have been thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(BusinessException);
                const response = (error as BusinessException).getResponse() as Record<
                    string,
                    unknown
                >;
                expect(response.errorCode).toBe(ErrorCode.PAYMENT_NOT_FOUND);
            }
        });
    });

    describe('markCancelled', () => {
        it('이미 CANCELLED인 경우 그대로 반환 (early return)', async () => {
            const payment = makePayment({ status: PaymentStatus.CANCELLED });

            const result = await service.markCancelled(payment);

            expect(result).toBe(payment);
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('markPaid - race condition에서 findByIdOrThrow 실패', () => {
        it('updatePaidIfRequested 실패 후 findById도 null → PAYMENT_NOT_FOUND', async () => {
            const payment = makePayment({ status: PaymentStatus.REQUESTED });
            mockRepository.updatePaidIfRequested.mockResolvedValue({ updated: false });
            mockRepository.findById.mockResolvedValue(null);

            const dto = {
                mul_no: 1700000000,
                pay_state: '4',
                userid: 'u',
                linkkey: 'k',
                linkval: 'v',
            };

            await expect(service.markPaid(payment, dto as never)).rejects.toThrow(
                BusinessException
            );
        });
    });
});
