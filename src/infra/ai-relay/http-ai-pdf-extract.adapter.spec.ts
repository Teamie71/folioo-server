/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { HttpAiPdfExtractAdapter } from './http-ai-pdf-extract.adapter';

class HttpServiceStub {
    readonly axiosRef = {
        post: jest.fn(),
    };
}

class ConfigServiceStub {
    readonly mockGet = jest.fn();

    get<T>(key: string): T | undefined {
        return this.mockGet(key) as T | undefined;
    }
}

describe('HttpAiPdfExtractAdapter', () => {
    let adapter: HttpAiPdfExtractAdapter;
    let httpServiceStub: HttpServiceStub;
    let configServiceStub: ConfigServiceStub;

    beforeEach(() => {
        httpServiceStub = new HttpServiceStub();
        configServiceStub = new ConfigServiceStub();
        adapter = new HttpAiPdfExtractAdapter(
            httpServiceStub as unknown as HttpService,
            configServiceStub as unknown as ConfigService
        );
    });

    describe('extractText', () => {
        it('includes X-API-Key header when AI_SERVICE_API_KEY is configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'test-extract-key-789';
                return undefined;
            });

            httpServiceStub.axiosRef.post.mockResolvedValue({
                data: { extracted_text: 'Sample extracted text from PDF' },
            });

            const fileBuffer = Buffer.from('fake pdf content');
            const result = await adapter.extractText(fileBuffer, 'test.pdf');

            expect(httpServiceStub.axiosRef.post).toHaveBeenCalledWith(
                'https://ai.example.com/api/v1/portfolio/extract',

                expect.any(FormData),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-API-Key': 'test-extract-key-789',
                    }),
                })
            );

            expect(result).toBeDefined();
        });

        it('throws BusinessException when AI_SERVICE_API_KEY is not configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return undefined;
                return undefined;
            });

            const fileBuffer = Buffer.from('fake pdf content');

            await expect(adapter.extractText(fileBuffer, 'test.pdf')).rejects.toThrow(
                BusinessException
            );

            await expect(adapter.extractText(fileBuffer, 'test.pdf')).rejects.toMatchObject({
                response: expect.objectContaining({
                    errorCode: ErrorCode.INTERVIEW_AI_RELAY_FAILED,
                }),
            });
        });

        it('throws BusinessException when AI_BASE_URL is not configured', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return undefined;
                return undefined;
            });

            const fileBuffer = Buffer.from('fake pdf content');

            await expect(adapter.extractText(fileBuffer, 'test.pdf')).rejects.toThrow(
                BusinessException
            );
        });

        it('returns extracted text when request succeeds', async () => {
            configServiceStub.mockGet.mockImplementation((key: string) => {
                if (key === 'AI_BASE_URL') return 'https://ai.example.com';
                if (key === 'AI_SERVICE_API_KEY') return 'valid-key';
                return undefined;
            });

            const expectedText = 'This is the extracted text from the PDF document.';
            httpServiceStub.axiosRef.post.mockResolvedValue({
                data: { extracted_text: expectedText },
            });

            const fileBuffer = Buffer.from('fake pdf content');
            const result = await adapter.extractText(fileBuffer, 'sample.pdf');

            expect(result).toEqual({
                extractedText: expectedText,
            });
        });
    });
});
