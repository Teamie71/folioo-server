import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const PAYAPP_API_TIMEOUT_MS = 10000;

type CancelFailureKind = 'TIMEOUT' | 'NETWORK' | 'HTTP_ERROR' | 'RESPONSE_READ_FAILED' | 'REJECTED';
type RequestFailureKind =
    | 'TIMEOUT'
    | 'NETWORK'
    | 'HTTP_ERROR'
    | 'RESPONSE_READ_FAILED'
    | 'REJECTED';

export interface CancelRequestContext {
    paymentId: number;
    currentStatus: string;
}

@Injectable()
export class PayAppClient {
    private readonly logger = new Logger(PayAppClient.name);
    private readonly userId: string;
    private readonly linkKey: string;
    private readonly linkValue: string;
    private readonly feedbackUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.userId = String(this.configService.get<string>('PAYAPP_USER_ID') ?? '');
        this.linkKey = String(this.configService.get<string>('PAYAPP_LINK_KEY') ?? '');
        this.linkValue = String(this.configService.get<string>('PAYAPP_LINK_VALUE') ?? '');
        this.feedbackUrl = String(this.configService.get<string>('PAYAPP_FEEDBACK_URL') ?? '');

        if (!this.userId || !this.linkKey || !this.feedbackUrl) {
            this.logger.error(
                'PayApp 필수 환경변수가 누락되었습니다. ' +
                    'PAYAPP_USER_ID, PAYAPP_LINK_KEY, PAYAPP_FEEDBACK_URL을 확인하세요.'
            );
        }
    }

    verifyWebhook(params: { userid?: string; linkkey?: string; linkval?: string }): void {
        if (!this.userId || !this.linkKey || !this.linkValue) {
            return;
        }

        if (
            params.userid !== this.userId ||
            params.linkkey !== this.linkKey ||
            params.linkval !== this.linkValue
        ) {
            throw new BusinessException(ErrorCode.PAYMENT_WEBHOOK_INVALID);
        }
    }

    async requestCancel(
        mulNo: number,
        cancelMemo: string,
        context?: CancelRequestContext
    ): Promise<void> {
        if (!this.userId || !this.linkKey) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const logCtx = context
            ? `paymentId=${context.paymentId}, mulNo=${mulNo}, status=${context.currentStatus}`
            : `mulNo=${mulNo}`;

        const body = new URLSearchParams({
            cmd: 'paycancelreq',
            userid: this.userId,
            linkkey: this.linkKey,
            mul_no: String(mulNo),
            cancelmemo: cancelMemo,
        });

        let response: Response;
        try {
            response = await fetch(PAYAPP_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
                signal: AbortSignal.timeout(PAYAPP_API_TIMEOUT_MS),
            });
        } catch (error) {
            const kind: CancelFailureKind =
                error instanceof Error && error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK';
            this.logger.error(
                `PayApp cancel ${kind}: ${logCtx}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.cancelFailure(kind, mulNo, context);
        }

        if (!response.ok) {
            this.logger.warn(`PayApp cancel HTTP_ERROR: ${logCtx}, httpStatus=${response.status}`);
            throw this.cancelFailure('HTTP_ERROR', mulNo, context, response.status);
        }

        let text: string;
        try {
            text = (await response.text()).trim();
        } catch (error) {
            this.logger.error(
                `PayApp cancel RESPONSE_READ_FAILED: ${logCtx}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.cancelFailure('RESPONSE_READ_FAILED', mulNo, context);
        }

        if (!text.startsWith('OK')) {
            this.logger.warn(`PayApp cancel REJECTED: ${logCtx}, response=${text.slice(0, 200)}`);
            throw this.cancelFailure('REJECTED', mulNo, context);
        }
    }

    async requestPayment(params: {
        mulNo: number;
        price: number;
        goodname: string;
    }): Promise<string> {
        if (!this.userId || !this.linkKey || !this.feedbackUrl) {
            this.logger.error(
                'PayApp requestPayment: missing config (userId, linkKey, or feedbackUrl)'
            );
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const body = new URLSearchParams({
            cmd: 'payrequest',
            userid: this.userId,
            linkkey: this.linkKey,
            goodname: params.goodname,
            price: String(params.price),
            mul_no: String(params.mulNo),
            feedbackurl: this.feedbackUrl,
            recvphone: '01000000000',
            smsuse: 'n',
        });

        let response: Response;
        try {
            response = await fetch(PAYAPP_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body,
                signal: AbortSignal.timeout(PAYAPP_API_TIMEOUT_MS),
            });
        } catch (error) {
            const kind: RequestFailureKind =
                error instanceof Error && error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK';
            this.logger.error(
                `PayApp request ${kind}: mulNo=${params.mulNo}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.buildRequestFailure(kind);
        }

        if (!response.ok) {
            this.logger.warn(
                `PayApp request HTTP_ERROR: mulNo=${params.mulNo}, httpStatus=${response.status}`
            );
            throw this.buildRequestFailure('HTTP_ERROR', response.status);
        }

        let text: string;
        try {
            text = (await response.text()).trim();
        } catch (error) {
            this.logger.error(
                `PayApp request RESPONSE_READ_FAILED: mulNo=${params.mulNo}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw this.buildRequestFailure('RESPONSE_READ_FAILED');
        }

        const payUrl = this.extractPayUrl(text);
        if (!payUrl) {
            this.logger.warn(
                `PayApp request REJECTED: mulNo=${params.mulNo}, response=${text.slice(0, 200)}`
            );
            throw this.buildRequestFailure('REJECTED');
        }

        return payUrl;
    }

    private extractPayUrl(text: string): string | null {
        // PayApp returns 'payurl=' (without underscore)
        const match = /payurl=([^\s&]+)/.exec(text);
        if (match) {
            try {
                return decodeURIComponent(match[1]);
            } catch {
                return match[1];
            }
        }
        if (text.startsWith('https://')) {
            return text;
        }
        return null;
    }

    private buildRequestFailure(kind: RequestFailureKind, httpStatus?: number): BusinessException {
        const details: Record<string, unknown> = { kind };
        if (httpStatus != null) {
            details.httpStatus = httpStatus;
        }
        return new BusinessException(ErrorCode.PAYMENT_EXTERNAL_API_FAILED, details);
    }

    private cancelFailure(
        kind: CancelFailureKind,
        mulNo: number,
        context?: CancelRequestContext,
        httpStatus?: number
    ): BusinessException {
        const details: Record<string, unknown> = {
            kind,
            mulNo,
        };

        if (context?.paymentId != null) {
            details.paymentId = context.paymentId;
        }

        if (httpStatus != null) {
            details.httpStatus = httpStatus;
        }

        return new BusinessException(ErrorCode.PAYMENT_EXTERNAL_API_FAILED, {
            ...details,
        });
    }
}
