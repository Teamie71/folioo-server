import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class WrapExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const resp = exception instanceof HttpException ? (exception.getResponse() as any) : null;

        const message =
            typeof resp === 'string'
                ? resp
                : (resp?.message ?? (exception as any)?.message ?? 'Internal Server Error');

        res.status(status).json({
            isSuccess: false,
            error: {
                code: resp?.errorCode ?? `HTTP_${status}`,
                message: Array.isArray(message) ? message.join(', ') : String(message),
            },
            result: null,
        });
    }
}
