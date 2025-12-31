import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonResponse } from '../dtos/common-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, CommonResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<CommonResponse<T>> {
        return next.handle().pipe(map((data: T) => CommonResponse.success<T>(data)));
    }
}
