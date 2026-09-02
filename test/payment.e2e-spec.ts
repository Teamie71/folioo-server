/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PaymentController } from '../src/modules/payment/presentation/payment.controller';
import { PaymentFacade } from '../src/modules/payment/application/facades/payment.facade';
import { PaymentService } from '../src/modules/payment/application/services/payment.service';
import { PaymentRepository } from '../src/modules/payment/infrastructure/repositories/payment.repository';
import { PayAppClient } from '../src/modules/payment/infrastructure/clients/payapp.client';
import { Payment } from '../src/modules/payment/domain/entities/payment.entity';
import { PaymentStatus } from '../src/modules/payment/domain/enums/payment-status.enum';
import { PayType } from '../src/modules/payment/domain/enums/pay-type.enum';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { ErrorCode } from '../src/common/exceptions/error-code.enum';

const TEST_USER_ID = 42;

// ── Mocks ──────────────────────────────────────────────────────

const mockPaymentRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByIdAndUserId: jest.fn(),
    existsById: jest.fn(),
    findByMulNo: jest.fn(),
    updatePaidIfRequested: jest.fn(),
};

const mockPayAppClient = {
    verifyWebhook: jest.fn(),
    requestPayment: jest.fn(),
    requestCancel: jest.fn(),
};

// ── Fixtures ───────────────────────────────────────────────────

function makePayment(overrides: Partial<Payment> = {}): Payment {
    const p = new Payment();
    Object.assign(p, {
        id: 1,
        userId: TEST_USER_ID,
        mulNo: 1700000000,
        amount: 10000,
        status: PaymentStatus.REQUESTED,
        payUrl: null,
        payType: null,
        cardName: null,
        payAuthCode: null,
        cardQuota: null,
        paidAt: null,
        cancelledAt: null,
        var1: null,
        var2: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    });
    return p;
}

function webhookBody(overrides: Record<string, unknown> = {}) {
    return {
        mul_no: 1700000000,
        pay_state: '4',
        userid: 'testuser',
        linkkey: 'testkey',
        linkval: 'testvalue',
        ...overrides,
    };
}

// ── Test Suite ─────────────────────────────────────────────────
// NOTE: 결제 생성(POST /payments)은 이용권 판매 로직과 함께 제거되었습니다.
// 결제 재설계가 나오기 전까지 이 스펙은 기존 결제(REQUESTED/PAID) 건에 대한
// 조회/웹훅/취소 흐름만 검증합니다.

describe('Payment API (e2e)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentController],
            providers: [
                PaymentFacade,
                PaymentService,
                { provide: PaymentRepository, useValue: mockPaymentRepository },
                { provide: PayAppClient, useValue: mockPayAppClient },
                {
                    provide: APP_GUARD,
                    useValue: {
                        canActivate: (ctx: ExecutionContext) => {
                            const req = ctx.switchToHttp().getRequest();
                            req.user = { sub: TEST_USER_ID };
                            return true;
                        },
                    },
                },
            ],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            })
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    // ── GET /payments/:paymentId ───────────────────────────────

    describe('GET /payments/:paymentId', () => {
        it('본인 결제 조회 성공', async () => {
            const payment = makePayment({ payUrl: 'https://pay.example.com/123' });
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(payment);

            const res = await request(app.getHttpServer()).get('/payments/1').expect(200);

            expect(res.body).toMatchObject({
                id: 1,
                status: PaymentStatus.REQUESTED,
                amount: 10000,
                payUrl: 'https://pay.example.com/123',
            });
            expect(res.body.createdAt).toBeDefined();
        });

        it('payUrl이 없는 결제 → null 반환', async () => {
            const payment = makePayment({ payUrl: undefined });
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(payment);

            const res = await request(app.getHttpServer()).get('/payments/1').expect(200);

            expect(res.body.payUrl).toBeNull();
        });

        it('존재하지 않는 결제 → 404', async () => {
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(null);
            mockPaymentRepository.existsById.mockResolvedValue(false);

            const res = await request(app.getHttpServer()).get('/payments/999').expect(404);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_NOT_FOUND);
        });

        it('타인의 결제 → 403', async () => {
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(null);
            mockPaymentRepository.existsById.mockResolvedValue(true);

            const res = await request(app.getHttpServer()).get('/payments/1').expect(403);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_NOT_OWNER);
        });

        it('잘못된 paymentId → 400', async () => {
            await request(app.getHttpServer()).get('/payments/abc').expect(400);
        });
    });

    // ── POST /payments/webhook ─────────────────────────────────

    describe('POST /payments/webhook', () => {
        it('결제 성공 웹훅 → PAID 전환', async () => {
            const requestedPayment = makePayment();
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date('2026-01-01T01:00:00Z'),
            });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(requestedPayment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(paidPayment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockPaymentRepository.updatePaidIfRequested).toHaveBeenCalledTimes(1);
        });

        it('웹훅에 결제 상세 필드 포함 시 저장', async () => {
            const requestedPayment = makePayment();

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(requestedPayment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(
                makePayment({
                    status: PaymentStatus.PAID,
                    paidAt: new Date(),
                    payType: PayType.CARD,
                    cardName: '신한카드',
                })
            );

            await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(
                    webhookBody({
                        pay_type: '1',
                        card_name: '신한카드',
                        pay_auth_code: 'AUTH123',
                        card_quota: '03',
                        var1: 'custom1',
                        var2: 'custom2',
                        amount: 10000,
                    })
                )
                .expect(200);

            const updateCall = mockPaymentRepository.updatePaidIfRequested.mock.calls[0][1];
            expect(updateCall).toMatchObject({
                status: PaymentStatus.PAID,
                payType: PayType.CARD,
                cardName: '신한카드',
                payAuthCode: 'AUTH123',
                cardQuota: '03',
                var1: 'custom1',
                var2: 'custom2',
            });
        });

        it('이미 결제된 건 → 멱등 처리', async () => {
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date(),
            });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(paidPayment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockPaymentRepository.updatePaidIfRequested).not.toHaveBeenCalled();
        });

        it('결제 실패 상태(pay_state != 4) → 무시', async () => {
            const payment = makePayment();
            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ pay_state: '2' }))
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockPaymentRepository.updatePaidIfRequested).not.toHaveBeenCalled();
        });

        it('잘못된 웹훅 서명 → SUCCESS 반환 (에러 흡수)', async () => {
            mockPayAppClient.verifyWebhook.mockImplementation(() => {
                throw new BusinessException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
            });

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ userid: 'hacker', linkkey: 'bad', linkval: 'bad' }))
                .expect(200);

            expect(res.text).toBe('SUCCESS');
        });

        it('금액 불일치 → SUCCESS 반환 (에러 흡수)', async () => {
            const payment = makePayment({ amount: 10000 });
            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ amount: 99999 }))
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockPaymentRepository.updatePaidIfRequested).not.toHaveBeenCalled();
        });

        it('price 필드로도 금액 검증', async () => {
            const payment = makePayment({ amount: 10000 });
            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);

            await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ price: 99999 }))
                .expect(200);

            expect(mockPaymentRepository.updatePaidIfRequested).not.toHaveBeenCalled();
        });

        it('amount/price 모두 없으면 금액 검증 스킵', async () => {
            const payment = makePayment();
            const paidPayment = makePayment({ status: PaymentStatus.PAID, paidAt: new Date() });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(paidPayment);

            await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(mockPaymentRepository.updatePaidIfRequested).toHaveBeenCalled();
        });

        it('존재하지 않는 mulNo → SUCCESS 반환 (에러 흡수)', async () => {
            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(null);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ mul_no: 9999999 }))
                .expect(200);

            expect(res.text).toBe('SUCCESS');
        });

        it('동시 웹훅 race condition → updatePaidIfRequested 실패 후 이미 PAID', async () => {
            const payment = makePayment();
            const alreadyPaid = makePayment({ status: PaymentStatus.PAID, paidAt: new Date() });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: false });
            mockPaymentRepository.findById.mockResolvedValue(alreadyPaid);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
        });

        it('race condition → updatePaidIfRequested 실패 후 CANCELLED 상태 → 에러 흡수', async () => {
            const payment = makePayment();
            const cancelledPayment = makePayment({ status: PaymentStatus.CANCELLED });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: false });
            mockPaymentRepository.findById.mockResolvedValue(cancelledPayment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
        });

        it('이미 취소된 결제에 웹훅 도착 → PAYMENT_ALREADY_PAID 에러 흡수', async () => {
            const cancelledPayment = makePayment({ status: PaymentStatus.CANCELLED });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(cancelledPayment);

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
        });

        it('필수 필드 누락 시 validation 실패 → SUCCESS 반환 (에러 흡수)', async () => {
            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send({ pay_state: '4' })
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockPayAppClient.verifyWebhook).not.toHaveBeenCalled();
        });

        it('알 수 없는 pay_type은 무시', async () => {
            const payment = makePayment();
            const paidPayment = makePayment({ status: PaymentStatus.PAID, paidAt: new Date() });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(payment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(paidPayment);

            await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody({ pay_type: '99' }))
                .expect(200);

            const updateCall = mockPaymentRepository.updatePaidIfRequested.mock.calls[0][1];
            expect(updateCall.payType).toBeUndefined();
        });
    });

    // ── POST /payments/:paymentId/cancel ───────────────────────

    describe('POST /payments/:paymentId/cancel', () => {
        it('PAID 결제 취소 성공 (PayApp 호출)', async () => {
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date(),
            });
            const cancelledPayment = makePayment({
                status: PaymentStatus.CANCELLED,
                cancelledAt: new Date(),
            });

            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(paidPayment);
            mockPayAppClient.requestCancel.mockResolvedValue(undefined);
            mockPaymentRepository.save.mockResolvedValue(cancelledPayment);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(201);

            expect(res.body.status).toBe(PaymentStatus.CANCELLED);
            expect(mockPayAppClient.requestCancel).toHaveBeenCalledWith(
                1700000000,
                'user_requested',
                { paymentId: 1, currentStatus: PaymentStatus.PAID }
            );
        });

        it('REQUESTED 결제 취소 (PayApp 미호출)', async () => {
            const requestedPayment = makePayment({ status: PaymentStatus.REQUESTED });
            const cancelledPayment = makePayment({
                status: PaymentStatus.CANCELLED,
                cancelledAt: new Date(),
            });

            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(requestedPayment);
            mockPaymentRepository.save.mockResolvedValue(cancelledPayment);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(201);

            expect(res.body.status).toBe(PaymentStatus.CANCELLED);
            expect(mockPayAppClient.requestCancel).not.toHaveBeenCalled();
        });

        it('이미 취소된 결제 → 멱등 처리', async () => {
            const cancelledPayment = makePayment({
                status: PaymentStatus.CANCELLED,
                cancelledAt: new Date(),
            });
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(cancelledPayment);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(201);

            expect(res.body.status).toBe(PaymentStatus.CANCELLED);
            expect(mockPayAppClient.requestCancel).not.toHaveBeenCalled();
            expect(mockPaymentRepository.save).not.toHaveBeenCalled();
        });

        it('존재하지 않는 결제 → 404', async () => {
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(null);
            mockPaymentRepository.existsById.mockResolvedValue(false);

            const res = await request(app.getHttpServer()).post('/payments/999/cancel').expect(404);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_NOT_FOUND);
        });

        it('타인의 결제 → 403', async () => {
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(null);
            mockPaymentRepository.existsById.mockResolvedValue(true);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(403);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_NOT_OWNER);
        });

        it('PayApp 취소 API 실패 → 500', async () => {
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date(),
            });

            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(paidPayment);
            mockPayAppClient.requestCancel.mockRejectedValue(
                new BusinessException(ErrorCode.PAYMENT_EXTERNAL_API_FAILED)
            );

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(500);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_EXTERNAL_API_FAILED);
            expect(mockPaymentRepository.save).not.toHaveBeenCalled();
        });

        it('취소할 수 없는 상태(REFUNDED) → 409', async () => {
            const refundedPayment = makePayment({ status: PaymentStatus.REFUNDED });
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(refundedPayment);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(409);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
        });

        it('잘못된 paymentId → 400', async () => {
            await request(app.getHttpServer()).post('/payments/abc/cancel').expect(400);
        });
    });
});
