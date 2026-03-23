/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConfigService } from '@nestjs/config';
import { PayAppClient } from './payapp.client';
import { BusinessException } from 'src/common/exceptions/business.exception';

const PAYAPP_CONFIG: Record<string, string> = {
    PAYAPP_USER_ID: 'testuser',
    PAYAPP_LINK_KEY: 'testkey',
    PAYAPP_LINK_VALUE: 'testvalue',
    PAYAPP_FEEDBACK_URL: 'https://example.com/webhook',
};

function makeConfigService(overrides: Record<string, string> = {}): ConfigService {
    const config = { ...PAYAPP_CONFIG, ...overrides };
    return { get: jest.fn((key: string) => config[key]) } as unknown as ConfigService;
}

function mockFetchResponse(body: string, ok = true, status = 200): Response {
    return {
        ok,
        status,
        text: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
}

describe('PayAppClient', () => {
    let client: PayAppClient;
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        client = new PayAppClient(makeConfigService());
        fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse(''));
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    // ── verifyWebhook ──────────────────────────────────────────

    describe('verifyWebhook', () => {
        it('올바른 자격 증명이면 통과', () => {
            expect(() =>
                client.verifyWebhook({
                    userid: 'testuser',
                    linkkey: 'testkey',
                    linkval: 'testvalue',
                })
            ).not.toThrow();
        });

        it('userid 불일치 → PAYMENT_WEBHOOK_INVALID', () => {
            expect(() =>
                client.verifyWebhook({
                    userid: 'wrong',
                    linkkey: 'testkey',
                    linkval: 'testvalue',
                })
            ).toThrow(BusinessException);
        });

        it('linkkey 불일치 → PAYMENT_WEBHOOK_INVALID', () => {
            expect(() =>
                client.verifyWebhook({
                    userid: 'testuser',
                    linkkey: 'wrong',
                    linkval: 'testvalue',
                })
            ).toThrow(BusinessException);
        });

        it('linkval 불일치 → PAYMENT_WEBHOOK_INVALID', () => {
            expect(() =>
                client.verifyWebhook({
                    userid: 'testuser',
                    linkkey: 'testkey',
                    linkval: 'wrong',
                })
            ).toThrow(BusinessException);
        });

        it('환경변수 누락 시 검증 스킵', () => {
            const emptyClient = new PayAppClient(makeConfigService({ PAYAPP_LINK_VALUE: '' }));
            expect(() =>
                emptyClient.verifyWebhook({
                    userid: 'anyone',
                    linkkey: 'any',
                    linkval: 'any',
                })
            ).not.toThrow();
        });
    });

    // ── requestPayment ─────────────────────────────────────────

    describe('requestPayment', () => {
        it('성공 → payUrl, mulNo 반환', async () => {
            fetchSpy.mockResolvedValue(
                mockFetchResponse('payurl=https%3A%2F%2Fpay.example.com%2F123&mul_no=9876543')
            );

            const result = await client.requestPayment({ price: 10000, goodname: '테스트 상품' });

            expect(result).toEqual({
                payUrl: 'https://pay.example.com/123',
                mulNo: 9876543,
            });

            const body = fetchSpy.mock.calls[0][1].body as URLSearchParams;
            expect(body.get('cmd')).toBe('payrequest');
            expect(body.get('price')).toBe('10000');
            expect(body.get('goodname')).toBe('테스트 상품');
            expect(body.get('feedbackurl')).toBe('https://example.com/webhook');
        });

        it('mulNo 없는 응답 → mulNo = 0', async () => {
            fetchSpy.mockResolvedValue(
                mockFetchResponse('payurl=https%3A%2F%2Fpay.example.com%2F456')
            );

            const result = await client.requestPayment({ price: 5000, goodname: '상품' });
            expect(result.mulNo).toBe(0);
            expect(result.payUrl).toBe('https://pay.example.com/456');
        });

        it('payurl 없는 응답 → REJECTED', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('error=some_error'));

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('디코딩 실패하는 payurl → 원본 반환', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('payurl=%ZZ&mul_no=111'));

            const result = await client.requestPayment({ price: 10000, goodname: '상품' });
            expect(result.payUrl).toBe('%ZZ');
        });

        it('HTTP 에러 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('', false, 503));

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('타임아웃 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            const timeoutError = new Error('timeout');
            timeoutError.name = 'TimeoutError';
            fetchSpy.mockRejectedValue(timeoutError);

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('네트워크 에러 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('Error가 아닌 throw → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockRejectedValue('string error');

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('응답 body 읽기 실패 → RESPONSE_READ_FAILED', async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockRejectedValue(new Error('body read failed')),
            });

            await expect(client.requestPayment({ price: 10000, goodname: '상품' })).rejects.toThrow(
                BusinessException
            );
        });

        it('환경변수 누락 → INTERNAL_SERVER_ERROR', async () => {
            const emptyClient = new PayAppClient(makeConfigService({ PAYAPP_USER_ID: '' }));

            await expect(
                emptyClient.requestPayment({ price: 10000, goodname: '상품' })
            ).rejects.toThrow(BusinessException);
        });
    });

    // ── requestCancel ──────────────────────────────────────────

    describe('requestCancel', () => {
        it('state=1 응답 → 성공', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('state=1'));

            await expect(client.requestCancel(123456, 'user_requested')).resolves.toBeUndefined();

            const body = fetchSpy.mock.calls[0][1].body as URLSearchParams;
            expect(body.get('cmd')).toBe('paycancel');
            expect(body.get('mul_no')).toBe('123456');
            expect(body.get('cancelmemo')).toBe('user_requested');
        });

        it('OK 응답 → 성공', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('OK'));

            await expect(client.requestCancel(123456, 'test')).resolves.toBeUndefined();
        });

        it('REJECTED 응답 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('fail=unknown_error'));

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('HTTP 에러 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('', false, 500));

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('타임아웃 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            const err = new Error('timeout');
            err.name = 'TimeoutError';
            fetchSpy.mockRejectedValue(err);

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('네트워크 에러 → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('Error가 아닌 throw → PAYMENT_EXTERNAL_API_FAILED', async () => {
            fetchSpy.mockRejectedValue('string error');

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('응답 body 읽기 실패 → RESPONSE_READ_FAILED', async () => {
            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                text: jest.fn().mockRejectedValue(new Error('body read failed')),
            });

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('context 포함 시 에러에 paymentId 포함', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('fail'));

            try {
                await client.requestCancel(123456, 'test', {
                    paymentId: 1,
                    currentStatus: 'PAID',
                });
                fail('should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(BusinessException);
                const response = (error as BusinessException).getResponse() as Record<
                    string,
                    unknown
                >;
                expect(response.details).toMatchObject({ paymentId: 1 });
            }
        });

        it('context 없이도 동작', async () => {
            fetchSpy.mockResolvedValue(mockFetchResponse('fail'));

            await expect(client.requestCancel(123456, 'test')).rejects.toThrow(BusinessException);
        });

        it('환경변수 누락 → INTERNAL_SERVER_ERROR', async () => {
            const emptyClient = new PayAppClient(makeConfigService({ PAYAPP_USER_ID: '' }));

            await expect(emptyClient.requestCancel(123, 'test')).rejects.toThrow(BusinessException);
        });
    });
});
