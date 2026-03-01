import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiPdfExtractPort, AiPdfExtractResult } from 'src/common/ports/ai-pdf-extract.port';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const EXTRACT_PATH = '/api/v1/portfolio/extract';

@Injectable()
export class HttpAiPdfExtractAdapter extends AiPdfExtractPort {
    private readonly logger = new Logger(HttpAiPdfExtractAdapter.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        super();
    }

    async extractText(fileBuffer: Buffer, fileName: string): Promise<AiPdfExtractResult> {
        const baseUrl = this.configService.get<string>('AI_BASE_URL');
        if (!baseUrl) {
            this.logger.error('AI_BASE_URL is not configured');
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const requestUrl = this.buildRequestUrl(baseUrl, EXTRACT_PATH);
        const formData = this.buildFormData(fileBuffer, fileName);

        try {
            const response = await this.httpService.axiosRef.post<{ extracted_text: string }>(
                requestUrl,
                formData,
                {
                    timeout: 60_000,
                }
            );

            const extractedText = response.data?.extracted_text;
            if (typeof extractedText !== 'string') {
                this.logger.error(
                    `Unexpected AI extract response shape: ${JSON.stringify(response.data)}`
                );
                throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
            }

            return { extractedText };
        } catch (error: unknown) {
            if (error instanceof BusinessException) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown extract error';
            this.logger.error(`Failed to extract text from PDF via AI server: ${errorMessage}`);
            throw new BusinessException(ErrorCode.PORTFOLIO_EXTRACT_FAILED);
        }
    }

    private buildRequestUrl(baseUrl: string, path: string): string {
        const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${normalizedBaseUrl}${normalizedPath}`;
    }

    private buildFormData(fileBuffer: Buffer, fileName: string): FormData {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'application/pdf' });
        formData.append('file', blob, fileName);
        return formData;
    }
}
