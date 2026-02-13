import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

@Injectable()
export class PayAppClient {
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

    async requestCancel(mulNo: number, cancelMemo: string): Promise<void> {
        if (!this.userId || !this.linkKey) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const body = new URLSearchParams({
            cmd: 'paycancelreq',
            userid: this.userId,
            linkkey: this.linkKey,
            mul_no: String(mulNo),
            cancelmemo: cancelMemo,
        });

        const response = await fetch(PAYAPP_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });

        if (!response.ok) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const text = (await response.text()).trim();
        if (!text.startsWith('OK')) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
