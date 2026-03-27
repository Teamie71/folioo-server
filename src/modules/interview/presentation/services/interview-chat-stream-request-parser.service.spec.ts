import { PassThrough } from 'stream';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    InterviewChatStreamRequestParserService,
    MultipartRequestLike,
} from './interview-chat-stream-request-parser.service';

type MockMultipartRequest = PassThrough & MultipartRequestLike;

function createMultipartRequest(body: Buffer, boundary: string): MockMultipartRequest {
    const request = Object.assign(new PassThrough(), {
        headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
        },
    }) as MockMultipartRequest;

    setImmediate(() => {
        request.end(body);
    });

    return request;
}

describe('InterviewChatStreamRequestParserService', () => {
    const parser = new InterviewChatStreamRequestParserService();

    it('parses message + insightId + pdf file payload', async () => {
        const boundary = 'folioo-interview-boundary';
        const fileBuffer = Buffer.from('%PDF-1.4\nfolioo');
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n프로젝트 보고서 첨부합니다\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="insightId"\r\n\r\n1\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            fileBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        await expect(parser.parse(createMultipartRequest(body, boundary))).resolves.toEqual({
            message: '프로젝트 보고서 첨부합니다',
            insightId: 1,
            file: {
                fileName: 'report.pdf',
                mimeType: 'application/pdf',
                buffer: fileBuffer,
            },
        });
    });

    it('rejects non-numeric insightId', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n안녕하세요\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="insightId"\r\n\r\ninsight-uuid-1\r\n`
            ),
            Buffer.from(`--${boundary}--\r\n`),
        ]);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: { reason: 'insightId must be a positive integer' },
            });
        }
    });

    it('accepts message-only payload without files', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n추가 질문이에요\r\n--${boundary}--\r\n`
        );

        await expect(parser.parse(createMultipartRequest(body, boundary))).resolves.toEqual({
            message: '추가 질문이에요',
        });
    });

    it('rejects unsupported file mime type', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n안녕하세요\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n`
            ),
            Buffer.from('plain-text'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: {
                    reason: 'only application/pdf or image/* is allowed',
                    mimeType: 'text/plain',
                },
            });
        }
    });

    it('rejects duplicate files field', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n안녕하세요\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="first.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('first-image'),
            Buffer.from('\r\n'),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="second.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('second-image'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: { reason: 'only one file is allowed' },
            });
        }
    });
});
