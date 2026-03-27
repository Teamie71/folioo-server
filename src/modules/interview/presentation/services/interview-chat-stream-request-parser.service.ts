import { Injectable } from '@nestjs/common';
import Busboy from 'busboy';
import type { IncomingHttpHeaders } from 'http';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

const MULTIPART_CONTENT_TYPE = 'multipart/form-data';
const CHAT_STREAM_FILE_FIELD = 'files';
const MAX_FILE_COUNT = 3;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FIELD_SIZE_BYTES = 2 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

export interface MultipartRequestLike {
    headers: IncomingHttpHeaders;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    unpipe(destination?: NodeJS.WritableStream): this;
}

export interface InterviewChatUploadFile {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
}

export interface InterviewChatStreamParsedRequest {
    message: string;
    insightId?: number;
    files?: InterviewChatUploadFile[];
}

@Injectable()
export class InterviewChatStreamRequestParserService {
    async parse(req: MultipartRequestLike): Promise<InterviewChatStreamParsedRequest> {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes(MULTIPART_CONTENT_TYPE)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, {
                reason: 'content-type must be multipart/form-data',
            });
        }

        return new Promise((resolve, reject) => {
            const parser = Busboy({
                headers: req.headers,
                limits: {
                    files: MAX_FILE_COUNT,
                    fields: 10,
                    fieldSize: MAX_FIELD_SIZE_BYTES,
                    fileSize: MAX_FILE_SIZE_BYTES,
                },
            });

            const parsedFiles: InterviewChatUploadFile[] = [];
            let parsedMessage: string | null = null;
            let parsedInsightId: number | undefined;
            let settled = false;

            const fail = (errorCode: ErrorCode, detail: Record<string, unknown>): void => {
                if (settled) {
                    return;
                }
                settled = true;
                req.unpipe(parser);
                reject(new BusinessException(errorCode, detail));
            };

            parser.on('field', (fieldName, value, info) => {
                if (info.valueTruncated) {
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'multipart field value exceeds size limit',
                        fieldName,
                        maxFieldSizeBytes: MAX_FIELD_SIZE_BYTES,
                    });
                    return;
                }

                if (fieldName === 'message') {
                    const normalized = value.trim();
                    if (!normalized) {
                        fail(ErrorCode.BAD_REQUEST, { reason: 'message must not be empty' });
                        return;
                    }
                    parsedMessage = normalized;
                    return;
                }

                if (fieldName === 'insightId') {
                    const normalized = value.trim();
                    if (!normalized) {
                        parsedInsightId = undefined;
                        return;
                    }

                    const insightId = Number.parseInt(normalized, 10);
                    if (!Number.isInteger(insightId) || insightId <= 0) {
                        fail(ErrorCode.BAD_REQUEST, {
                            reason: 'insightId must be a positive integer',
                        });
                        return;
                    }

                    parsedInsightId = insightId;
                }
            });

            parser.on('file', (fieldName, fileStream, info) => {
                if (fieldName !== CHAT_STREAM_FILE_FIELD) {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: `unsupported file field: ${fieldName}`,
                    });
                    return;
                }

                if (
                    info.mimeType !== PDF_MIME_TYPE &&
                    !info.mimeType.toLowerCase().startsWith('image/')
                ) {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'only application/pdf or image/* is allowed',
                        mimeType: info.mimeType,
                    });
                    return;
                }

                const chunks: Buffer[] = [];
                const parsedFileName = info.filename || 'upload.bin';
                const parsedFileMimeType = info.mimeType;

                fileStream.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                fileStream.on('limit', () => {
                    fileStream.resume();
                    fail(ErrorCode.BAD_REQUEST, {
                        reason: 'file size exceeds 10MB limit',
                    });
                });

                fileStream.on('error', () => {
                    fail(ErrorCode.INTERVIEW_AI_RELAY_FAILED, {
                        reason: 'failed while reading uploaded file stream',
                    });
                });

                fileStream.on('end', () => {
                    if (settled) {
                        return;
                    }

                    parsedFiles.push({
                        fileName: parsedFileName,
                        mimeType: parsedFileMimeType,
                        buffer: Buffer.concat(chunks),
                    });
                });
            });

            parser.on('filesLimit', () => {
                fail(ErrorCode.BAD_REQUEST, {
                    reason: 'up to 3 files are allowed',
                    maxFileCount: MAX_FILE_COUNT,
                });
            });

            parser.on('error', () => {
                fail(ErrorCode.INTERVIEW_AI_RELAY_FAILED, {
                    reason: 'failed to parse multipart payload',
                });
            });

            parser.on('finish', () => {
                if (settled) {
                    return;
                }

                if (!parsedMessage) {
                    fail(ErrorCode.BAD_REQUEST, { reason: 'message is required' });
                    return;
                }

                settled = true;
                resolve({
                    message: parsedMessage,
                    insightId: parsedInsightId,
                    ...(parsedFiles.length > 0 && {
                        files: parsedFiles,
                    }),
                });
            });

            req.pipe(parser);
        });
    }
}
