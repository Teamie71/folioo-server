import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SocialUserAfterOAuth } from 'src/modules/auth/domain/types/jwt-payload.type';

export const User = createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: Record<string, any> }>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return data ? request.user?.[data] : request.user;
});

export const SocialUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: SocialUserAfterOAuth }>();
    return request.user;
});
