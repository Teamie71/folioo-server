import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UserAfterAuth } from 'src/modules/auth/domain/types/jwt-payload.type';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    handleRequest<TUser = UserAfterAuth>(
        err: unknown,
        user: TUser,
        _info: unknown,
        _context: ExecutionContext,
        _status?: unknown
    ): TUser {
        void _info;
        void _context;
        void _status;

        if (err) {
            if (err instanceof Error) {
                throw err;
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        if (!user) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        return user;
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<{ path?: string; originalUrl?: string }>();
        const requestPath = request.path ?? request.originalUrl ?? '';
        if (requestPath === '/admin' || requestPath.startsWith('/admin/')) {
            return true;
        }

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        return super.canActivate(context) as Promise<boolean> | boolean;
    }
}
