import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class EventAdminGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<{ headers: Record<string, string | string[] | undefined> }>();

        const expectedAdminKey = this.configService.get<string>('EVENT_ADMIN_API_KEY');
        if (!expectedAdminKey) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        const headerValue = request.headers['x-event-admin-key'];
        const adminKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

        if (!adminKey || adminKey !== expectedAdminKey) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return true;
    }
}
