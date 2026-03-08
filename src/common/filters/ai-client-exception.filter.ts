import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorMap } from '../exceptions/error-code';
import { ErrorCode } from '../exceptions/error-code.enum';

interface ValidationErrorResponse {
    message: string | string[];
    statusCode: number;
}

@Catch()
@Injectable()
export class AiClientExceptionFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        let detail = ErrorMap[ErrorCode.INTERNAL_SERVER_ERROR].message;
        let details: unknown = null;

        if (exception instanceof HttpException) {
            const response = exception.getResponse() as unknown;

            if (this.isValidationError(exception, response)) {
                const validation = response as ValidationErrorResponse;
                errorCode = ErrorCode.BAD_REQUEST;
                detail = ErrorMap[ErrorCode.BAD_REQUEST].message;
                details = Array.isArray(validation.message)
                    ? validation.message
                    : [validation.message];
            } else if (typeof response === 'object' && response !== null) {
                const payload = response as Record<string, unknown>;
                const responseErrorCode = payload.errorCode;
                const responseReason = payload.reason;
                errorCode =
                    typeof responseErrorCode === 'string'
                        ? (responseErrorCode as ErrorCode)
                        : errorCode;
                detail = typeof responseReason === 'string' ? responseReason : detail;
                details = payload.details ?? null;
            }
        }

        httpAdapter.reply(
            ctx.getResponse(),
            {
                errorCode,
                detail,
                details,
            },
            httpStatus
        );
    }

    private isValidationError(exception: HttpException, response: unknown): boolean {
        if (!(exception instanceof BadRequestException)) {
            return false;
        }

        if (typeof response !== 'object' || response === null) {
            return false;
        }

        const payload = response as Record<string, unknown>;
        return 'message' in payload && 'statusCode' in payload && !('errorCode' in payload);
    }
}
