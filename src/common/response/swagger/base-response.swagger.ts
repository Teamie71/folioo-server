// common/interceptors/base-response.interceptor.ts
import { Injectable } from '@nestjs/common';
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
@Injectable()
export class BaseResponseInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
        return next.handle().pipe(map((result) => ({ isSuccess: true, error: null, result })));
    }
}
