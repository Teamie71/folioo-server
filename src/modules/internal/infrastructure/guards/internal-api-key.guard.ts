import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

type InternalRequest = {
    headers?: {
        'x-api-key'?: string | string[];
    };
};

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
    private readonly logger = new Logger(InternalApiKeyGuard.name);

    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const expectedApiKey = this.configService.get<string>('MAIN_BACKEND_API_KEY');

        if (!expectedApiKey) {
            this.logger.error('MAIN_BACKEND_API_KEY is not configured');
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }

        const request = context.switchToHttp().getRequest<InternalRequest>();
        const providedApiKey = this.extractApiKey(request.headers?.['x-api-key']);

        if (!providedApiKey || !this.isSameApiKey(providedApiKey, expectedApiKey)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return true;
    }

    private extractApiKey(rawApiKey: string | string[] | undefined): string | null {
        const normalizedApiKey = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;

        if (typeof normalizedApiKey === 'string') {
            const trimmed = normalizedApiKey.trim();
            return trimmed.length > 0 ? trimmed : null;
        }

        return null;
    }

    private isSameApiKey(providedApiKey: string, expectedApiKey: string): boolean {
        const providedBuffer = Buffer.from(providedApiKey);
        const expectedBuffer = Buffer.from(expectedApiKey);

        if (providedBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return timingSafeEqual(providedBuffer, expectedBuffer);
    }
}
