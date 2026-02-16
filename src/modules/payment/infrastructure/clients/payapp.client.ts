import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const PAYAPP_API_TIMEOUT_MS = 10000;

type CancelFailureKind = 'TIMEOUT' | 'NETWORK' | 'HTTP_ERROR' | 'RESPONSE_READ_FAILED' | 'REJECTED';

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

    constructor(private readonly configService: ConfigService) {
        this.userId = String(this.configService.get<string>('PAYAPP_USER_ID') ?? '');
        this.linkKey = String(this.configService.get<string>('PAYAPP_LINK_KEY') ?? '');
        this.linkValue = String(this.configService.get<string>('PAYAPP_LINK_VALUE') ?? '');
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
