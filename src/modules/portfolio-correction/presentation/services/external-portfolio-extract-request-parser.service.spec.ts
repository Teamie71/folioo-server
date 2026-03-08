import { PassThrough } from 'stream';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    ExternalPortfolioExtractRequestParserService,
    MultipartRequestLike,
} from './external-portfolio-extract-request-parser.service';

type MockMultipartRequest = PassThrough & MultipartRequestLike;

function createMultipartBody(
    boundary: string,
    correctionId: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
): Buffer {
    return Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="correctionId"\r\n\r\n${correctionId}\r\n`
        ),
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
        ),
        fileBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
}

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

describe('ExternalPortfolioExtractRequestParserService', () => {
    const parser = new ExternalPortfolioExtractRequestParserService();

    it('parses a valid correctionId and PDF upload', async () => {
        const boundary = 'folioo-boundary';
        const fileBuffer = Buffer.from('%PDF-1.4\nfolioo');
        const request = createMultipartRequest(
            createMultipartBody(boundary, '3', 'portfolio.pdf', 'application/pdf', fileBuffer),
            boundary
        );

        await expect(parser.parse(request)).resolves.toEqual({
            correctionId: 3,
            fileBuffer,
            fileName: 'portfolio.pdf',
        });
    });

    it('rejects non-pdf uploads', async () => {
        const boundary = 'folioo-boundary';
        const request = createMultipartRequest(
            createMultipartBody(
                boundary,
                '3',
                'portfolio.txt',
                'text/plain',
                Buffer.from('not-a-pdf')
            ),
            boundary
        );

        expect.assertions(2);

        try {
            await parser.parse(request);
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: {
                    reason: 'only application/pdf is allowed',
                    mimeType: 'text/plain',
                },
            });
        }
    });

    it('ignores unexpected file fields until the target file field appears', async () => {
        const boundary = 'folioo-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="correctionId"\r\n\r\n3\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="ignored.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nignored'),
            Buffer.from(`\r\n`),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="portfolio.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nfolioo'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const request = createMultipartRequest(body, boundary);

        await expect(parser.parse(request)).resolves.toMatchObject({
            correctionId: 3,
            fileName: 'portfolio.pdf',
        });
    });

    it('rejects duplicate target file fields', async () => {
        const boundary = 'folioo-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="correctionId"\r\n\r\n3\r\n`
            ),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="portfolio-1.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nfirst'),
            Buffer.from(`\r\n`),
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="portfolio-2.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nsecond'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const request = createMultipartRequest(body, boundary);

        expect.assertions(2);

        try {
            await parser.parse(request);
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: { reason: 'only one file is allowed' },
            });
        }
    });

    it('rejects requests without correctionId', async () => {
        const boundary = 'folioo-boundary';
        const body = Buffer.concat([
            Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="portfolio.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
            ),
            Buffer.from('%PDF-1.4\nfolioo'),
            Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);
        const request = createMultipartRequest(body, boundary);

        expect.assertions(2);

        try {
            await parser.parse(request);
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: { reason: 'correctionId is required' },
            });
        }
    });

    it('rejects invalid pdf signature even with pdf mime type', async () => {
        const boundary = 'folioo-boundary';
        const request = createMultipartRequest(
            createMultipartBody(
                boundary,
                '3',
                'portfolio.pdf',
                'application/pdf',
                Buffer.from('NOT_PDF_CONTENT')
            ),
            boundary
        );

        expect.assertions(2);

        try {
            await parser.parse(request);
        } catch (error) {
            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getResponse()).toMatchObject({
                errorCode: ErrorCode.BAD_REQUEST,
                details: { reason: 'uploaded file is not a valid PDF' },
            });
        }
    });
});
