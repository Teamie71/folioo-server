// src/modules/auth/infra/guards/jwt-access.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtTokenService } from '../token/jwt-token-issuer';

@Injectable()
export class JwtAccessGuard implements CanActivate {
    constructor(private readonly issuer: JwtTokenService) {}

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const token = req.cookies?.accessToken || this.extractBearer(req);

        if (!token) throw new UnauthorizedException('No access token');

        const payload = this.issuer.verifyAccess(token);
        (req as any).user = { userId: payload.userId };
        return true;
    }

    private extractBearer(req: Request) {
        const auth = req.headers.authorization;
        if (!auth) return null;
        const [type, token] = auth.split(' ');
        if (type !== 'Bearer' || !token) return null;
        return token;
    }
}
