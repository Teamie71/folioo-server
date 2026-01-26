import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { captureException } from '@sentry/nestjs';
import { CommonResponse, ErrorPayload } from '../dtos/common-response.dto';
import { ErrorMap } from '../exceptions/error-code';
import { ErrorCode } from '../exceptions/error-code.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;

        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        if (httpStatus >= 500) {
            captureException(exception instanceof Error ? exception : new Error(String(exception)));
        }

        const path = httpAdapter.getRequestUrl(ctx.getRequest()) as string;

        let errorCode = 'UNKNOWN';
        let reason = 'Business Exception을 사용하세요.';
        let details: unknown = null;

        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse() as unknown;

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse as ErrorPayload;
                errorCode = res.errorCode ?? String(httpStatus);
                reason = res.reason ?? reason;
                details = res.details ?? null;
            }
        } else {
            // 시스템 에러
            this.logger.error(
                `🚨 [Unexpected Error] ${path}`,
                exception instanceof Error ? exception.stack : String(exception)
            );

            errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
            reason = ErrorMap.COMMON500.message;
        }

        const result = CommonResponse.fail(errorCode, reason, path, details);
        if (httpStatus < 500) {
            this.logger.warn(`⚠️ [Client Error] ${path}: ${reason}`);
        }
        httpAdapter.reply(ctx.getResponse(), result, httpStatus);
    }
}
