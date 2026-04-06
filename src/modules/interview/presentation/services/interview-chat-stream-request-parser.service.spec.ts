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
            files: [
                {
                    fileName: 'report.pdf',
                    mimeType: 'application/pdf',
                    buffer: fileBuffer,
                },
            ],
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
                errorCode: ErrorCode.INTERVIEW_INSIGHT_ID_INVALID,
                details: { reason: 'insightId must be a positive integer' },
            });
        }
    });

    it('rejects when multipart fields count exceeds limit', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n안녕하세요\r\n`
            ),
            ...Array.from({ length: 10 }, (_, index) =>
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="extraField${index}"\r\n\r\nvalue${index}\r\n`
                )
            ),
            Buffer.from(`--${boundary}--\r\n`),
        ]);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.INTERVIEW_FIELD_COUNT_EXCEEDED,
                details: {
                    reason: 'too many multipart fields were provided',
                    maxFieldCount: 10,
                },
            });
        }
    });

    it('rejects truncated field value when message exceeds fieldSize limit', async () => {
        const boundary = 'folioo-interview-boundary';
        const oversizedMessage = 'a'.repeat(2 * 1024 * 1024 + 1);
        const body = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${oversizedMessage}\r\n--${boundary}--\r\n`
        );

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.INTERVIEW_MULTIPART_FIELD_VALUE_TOO_LARGE,
                details: {
                    reason: 'multipart field value exceeds size limit',
                    fieldName: 'message',
                },
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

    it('accepts file-only payload without message', async () => {
        const boundary = 'folioo-interview-boundary';
        const imageBuffer = Buffer.from('image-bytes');
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="evidence.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            imageBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        await expect(parser.parse(createMultipartRequest(body, boundary))).resolves.toEqual({
            message: '',
            files: [
                {
                    fileName: 'evidence.png',
                    mimeType: 'image/png',
                    buffer: imageBuffer,
                },
            ],
        });
    });

    it('rejects when both message and files are missing', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.from(`--${boundary}--\r\n`);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.INTERVIEW_MESSAGE_REQUIRED,
                details: {
                    reason: 'message is required',
                },
            });
        }
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
                errorCode: ErrorCode.INTERVIEW_FILE_MIME_INVALID,
                details: {
                    reason: 'only application/pdf or image/* is allowed',
                    mimeType: 'text/plain',
                },
            });
        }
    });

    it('accepts up to 3 files under files field', async () => {
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
            Buffer.from('\r\n'),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="third.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nthird'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        await expect(parser.parse(createMultipartRequest(body, boundary))).resolves.toMatchObject({
            message: '안녕하세요',
            files: [
                { fileName: 'first.png', mimeType: 'image/png' },
                { fileName: 'second.png', mimeType: 'image/png' },
                { fileName: 'third.pdf', mimeType: 'application/pdf' },
            ],
        });
    });

    it('rejects when more than 3 files are uploaded', async () => {
        const boundary = 'folioo-interview-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n안녕하세요\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="f1.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('f1'),
            Buffer.from('\r\n'),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="f2.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('f2'),
            Buffer.from('\r\n'),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="f3.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('f3'),
            Buffer.from('\r\n'),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="f4.png"\r\nContent-Type: image/png\r\n\r\n`
            ),
            Buffer.from('f4'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.INTERVIEW_FILE_COUNT_EXCEEDED,
                details: { reason: 'up to 3 files are allowed', maxFileCount: 3 },
            });
        }
    });

    it('rejects field name truncation as bad request', async () => {
        const boundary = 'folioo-interview-boundary';
        const oversizedFieldName = 'a'.repeat(2 * 1024 * 1024 + 1);
        const body = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${oversizedFieldName}"\r\n\r\nvalue\r\n--${boundary}--\r\n`
        );

        expect.assertions(2);

        try {
            await parser.parse(createMultipartRequest(body, boundary));
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.INTERVIEW_MULTIPART_INVALID_PAYLOAD,
                details: { reason: 'invalid multipart payload' },
            });
        }
    });
});
