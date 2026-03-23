/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
jest.mock('typeorm-transactional', () => ({
    Transactional: () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
        descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { QueryFailedError } from 'typeorm';
import { PaymentController } from '../src/modules/payment/presentation/payment.controller';
import { PaymentFacade } from '../src/modules/payment/application/facades/payment.facade';
import { PaymentService } from '../src/modules/payment/application/services/payment.service';
import { PaymentRepository } from '../src/modules/payment/infrastructure/repositories/payment.repository';
import { PayAppClient } from '../src/modules/payment/infrastructure/clients/payapp.client';
import { TicketProductService } from '../src/modules/ticket/application/services/ticket-product.service';
import { TicketGrantFacade } from '../src/modules/ticket/application/facades/ticket-grant.facade';
import { TicketService } from '../src/modules/ticket/application/services/ticket.service';
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
    existsByMulNo: jest.fn(),
    findByMulNo: jest.fn(),
    updatePaidIfRequested: jest.fn(),
};

const mockPayAppClient = {
    verifyWebhook: jest.fn(),
    requestPayment: jest.fn(),
    requestCancel: jest.fn(),
};

const mockTicketProductService = { findByIdOrThrow: jest.fn() };
const mockTicketGrantFacade = { issueGrantAndTickets: jest.fn() };
const mockTicketService = { revokeAvailableTicketsForPayment: jest.fn() };

// ── Fixtures ───────────────────────────────────────────────────

function makePayment(overrides: Partial<Payment> = {}): Payment {
    const p = new Payment();
    Object.assign(p, {
        id: 1,
        userId: TEST_USER_ID,
        ticketProductId: 1,
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

const ticketProduct = {
    id: 1,
    type: 'EXPERIENCE',
    quantity: 3,
    price: 10000,
    getDisplayName: () => '경험 정리 3장',
};

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

function uniqueViolationError(): QueryFailedError {
    const err = new QueryFailedError('INSERT', [], new Error('unique'));
    (err as unknown as { code: string }).code = '23505';
    return err;
}

// ── Test Suite ─────────────────────────────────────────────────

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
                { provide: TicketProductService, useValue: mockTicketProductService },
                { provide: TicketGrantFacade, useValue: mockTicketGrantFacade },
                { provide: TicketService, useValue: mockTicketService },
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

    // ── POST /payments ─────────────────────────────────────────

    describe('POST /payments', () => {
        it('결제 요청 생성 성공', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            mockPaymentRepository.save.mockImplementation(async (entity: Partial<Payment>) => ({
                ...entity,
                id: 1,
                createdAt: new Date('2026-01-01T00:00:00Z'),
                updatedAt: new Date('2026-01-01T00:00:00Z'),
            }));
            mockPayAppClient.requestPayment.mockResolvedValue({
                payUrl: 'https://pay.example.com/123',
                mulNo: 9876543,
            });

            const res = await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(201);

            expect(res.body).toMatchObject({
                id: 1,
                ticketProductId: 1,
                status: PaymentStatus.REQUESTED,
                amount: 10000,
                payUrl: 'https://pay.example.com/123',
            });
            expect(mockPayAppClient.requestPayment).toHaveBeenCalledWith({
                price: 10000,
                goodname: '경험 정리 3장',
            });
        });

        it('mulNo 충돌 시 재시도 후 성공', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            mockPaymentRepository.save
                .mockRejectedValueOnce(uniqueViolationError())
                .mockRejectedValueOnce(uniqueViolationError())
                .mockImplementationOnce(async (entity: Partial<Payment>) => ({
                    ...entity,
                    id: 1,
                    createdAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-01T00:00:00Z'),
                }))
                .mockImplementation(async (entity: Partial<Payment>) => ({
                    ...entity,
                    createdAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-01T00:00:00Z'),
                }));
            mockPayAppClient.requestPayment.mockResolvedValue({
                payUrl: 'https://pay.example.com/456',
                mulNo: 1111,
            });

            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(201);

            expect(mockPaymentRepository.save).toHaveBeenCalledTimes(4);
        });

        it('mulNo 재시도 모두 실패 시 500', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            mockPaymentRepository.save.mockRejectedValue(uniqueViolationError());

            const res = await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(500);

            expect(res.body.errorCode).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
        });

        it('generateMulNo에서 기존 mulNo 건너뛰기', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            mockPaymentRepository.save.mockImplementation(async (entity: Partial<Payment>) => ({
                ...entity,
                id: 1,
                createdAt: new Date('2026-01-01T00:00:00Z'),
                updatedAt: new Date('2026-01-01T00:00:00Z'),
            }));
            mockPayAppClient.requestPayment.mockResolvedValue({
                payUrl: 'https://pay.example.com/789',
                mulNo: 2222,
            });

            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(201);

            expect(mockPaymentRepository.existsByMulNo).toHaveBeenCalledTimes(3);
        });

        it('PayApp 결제 요청 실패 시 결제 취소 후 500', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            const savedPayment = makePayment();
            mockPaymentRepository.save.mockResolvedValue(savedPayment);
            mockPayAppClient.requestPayment.mockRejectedValue(
                new BusinessException(ErrorCode.PAYMENT_EXTERNAL_API_FAILED)
            );

            const res = await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(500);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_EXTERNAL_API_FAILED);
            expect(mockPaymentRepository.save).toHaveBeenCalledTimes(2);
        });

        it('mulNo가 0이면 원래 mulNo 유지', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            mockPaymentRepository.save.mockImplementation(async (entity: Partial<Payment>) => ({
                ...entity,
                id: 1,
                createdAt: new Date('2026-01-01T00:00:00Z'),
                updatedAt: new Date('2026-01-01T00:00:00Z'),
            }));
            mockPayAppClient.requestPayment.mockResolvedValue({
                payUrl: 'https://pay.example.com/999',
                mulNo: 0,
            });

            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(201);

            const secondSaveCall = mockPaymentRepository.save.mock.calls[1][0];
            expect(secondSaveCall.mulNo).not.toBe(0);
        });

        it('존재하지 않는 ticketProductId → 404', async () => {
            mockTicketProductService.findByIdOrThrow.mockRejectedValue(
                new BusinessException(ErrorCode.TICKET_PRODUCT_NOT_FOUND)
            );

            const res = await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 9999 })
                .expect(404);

            expect(res.body.errorCode).toBe(ErrorCode.TICKET_PRODUCT_NOT_FOUND);
        });

        it('ticketProductId 누락 → 400', async () => {
            await request(app.getHttpServer()).post('/payments').send({}).expect(400);
        });

        it('ticketProductId가 음수 → 400', async () => {
            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: -1 })
                .expect(400);
        });

        it('허용되지 않은 필드 → 400', async () => {
            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1, hack: 'value' })
                .expect(400);
        });

        it('DB 저장 시 unique violation이 아닌 에러 → 그대로 throw', async () => {
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockPaymentRepository.existsByMulNo.mockResolvedValue(false);
            mockPaymentRepository.save.mockRejectedValue(new Error('connection lost'));

            await request(app.getHttpServer())
                .post('/payments')
                .send({ ticketProductId: 1 })
                .expect(500);
        });
    });

    // ── GET /payments/:paymentId ───────────────────────────────

    describe('GET /payments/:paymentId', () => {
        it('본인 결제 조회 성공', async () => {
            const payment = makePayment({ payUrl: 'https://pay.example.com/123' });
            mockPaymentRepository.findByIdAndUserId.mockResolvedValue(payment);

            const res = await request(app.getHttpServer()).get('/payments/1').expect(200);

            expect(res.body).toMatchObject({
                id: 1,
                ticketProductId: 1,
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
        it('결제 성공 웹훅 → PAID 전환 및 티켓 발급', async () => {
            const requestedPayment = makePayment();
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date('2026-01-01T01:00:00Z'),
            });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(requestedPayment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(paidPayment);
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockTicketGrantFacade.issueGrantAndTickets.mockResolvedValue({});

            const res = await request(app.getHttpServer())
                .post('/payments/webhook')
                .send(webhookBody())
                .expect(200);

            expect(res.text).toBe('SUCCESS');
            expect(mockTicketGrantFacade.issueGrantAndTickets).toHaveBeenCalledTimes(1);
            expect(mockTicketGrantFacade.issueGrantAndTickets).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: TEST_USER_ID,
                    rewards: [{ type: 'EXPERIENCE', quantity: 3 }],
                })
            );
        });

        it('웹훅에 결제 상세 필드 포함 시 저장', async () => {
            const requestedPayment = makePayment();
            const paidPayment = makePayment({
                status: PaymentStatus.PAID,
                paidAt: new Date(),
                payType: PayType.CARD,
                cardName: '신한카드',
            });

            mockPayAppClient.verifyWebhook.mockReturnValue(undefined);
            mockPaymentRepository.findByMulNo.mockResolvedValue(requestedPayment);
            mockPaymentRepository.updatePaidIfRequested.mockResolvedValue({ updated: true });
            mockPaymentRepository.findById.mockResolvedValue(paidPayment);
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockTicketGrantFacade.issueGrantAndTickets.mockResolvedValue({});

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

        it('이미 결제된 건 → 멱등 처리 (티켓 미발급)', async () => {
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
            expect(mockTicketGrantFacade.issueGrantAndTickets).not.toHaveBeenCalled();
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
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockTicketGrantFacade.issueGrantAndTickets.mockResolvedValue({});

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
            expect(mockTicketGrantFacade.issueGrantAndTickets).not.toHaveBeenCalled();
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
            mockTicketProductService.findByIdOrThrow.mockResolvedValue(ticketProduct);
            mockTicketGrantFacade.issueGrantAndTickets.mockResolvedValue({});

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
        it('PAID 결제 취소 성공 (PayApp 호출 + 티켓 회수)', async () => {
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
            mockTicketService.revokeAvailableTicketsForPayment.mockResolvedValue(undefined);

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(201);

            expect(res.body.status).toBe(PaymentStatus.CANCELLED);
            expect(mockPayAppClient.requestCancel).toHaveBeenCalledWith(
                1700000000,
                'user_requested',
                { paymentId: 1, currentStatus: PaymentStatus.PAID }
            );
            expect(mockTicketService.revokeAvailableTicketsForPayment).toHaveBeenCalledWith(
                cancelledPayment.id
            );
        });

        it('REQUESTED 결제 취소 (PayApp 미호출, 티켓 회수 없음)', async () => {
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
            expect(mockTicketService.revokeAvailableTicketsForPayment).not.toHaveBeenCalled();
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

        it('사용된 티켓이 있으면 취소 불가 → 409', async () => {
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
            mockTicketService.revokeAvailableTicketsForPayment.mockRejectedValue(
                new BusinessException(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED)
            );

            const res = await request(app.getHttpServer()).post('/payments/1/cancel').expect(409);

            expect(res.body.errorCode).toBe(ErrorCode.PAYMENT_CANCEL_NOT_ALLOWED);
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
