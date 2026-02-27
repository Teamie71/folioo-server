import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    AiSseRelayConnection,
    AiSseRelayPort,
    AiSseRelayRequest,
} from 'src/common/ports/ai-sse-relay.port';

@Injectable()
export class HttpAiSseRelayAdapter extends AiSseRelayPort {
    private readonly logger = new Logger(HttpAiSseRelayAdapter.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    async openPostStream(request: AiSseRelayRequest): Promise<AiSseRelayConnection> {
        const baseUrl = this.configService.get<string>('AI_BASE_URL');
        if (!baseUrl) {
            this.logger.error('AI_BASE_URL is not configured');
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const abortController = new AbortController();
        const requestUrl = this.buildRequestUrl(baseUrl, request.path);

        try {
            const response = await this.httpService.axiosRef.post<Readable>(
                requestUrl,
                request.body,
                {
                    responseType: 'stream',
                    signal: abortController.signal,
                    timeout: 0,
                    headers: {
                        Accept: 'text/event-stream',
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                stream: response.data,
                close: () => abortController.abort(),
                responseHeaders: this.extractHeaders(response.headers as Record<string, unknown>),
            };
        } catch (error: unknown) {
            if (axios.isCancel(error)) {
                this.logger.warn('AI SSE relay request was canceled before being connected');
                throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown relay error';
            this.logger.error(`Failed to connect AI SSE stream: ${errorMessage}`);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private buildRequestUrl(baseUrl: string, path: string): string {
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${normalizedBaseUrl}${normalizedPath}`;
    }

    private extractHeaders(headers: Record<string, unknown>): Record<string, string> {
        const normalizedHeaders: Record<string, string> = {};

        for (const [rawName, rawValue] of Object.entries(headers)) {
            const normalizedName = rawName.toLowerCase();
            const normalizedValue = this.normalizeHeaderValue(rawValue);
            if (!normalizedValue) {
                continue;
            }
            normalizedHeaders[normalizedName] = normalizedValue;
        }

        return normalizedHeaders;
    }

    private normalizeHeaderValue(value: unknown): string | null {
        if (typeof value === 'string') {
            return value;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }

        if (Array.isArray(value)) {
            const stringValues = value.filter((item): item is string => typeof item === 'string');
            return stringValues.length > 0 ? stringValues.join(',') : null;
        }

        return null;
    }
}
