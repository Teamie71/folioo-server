import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
    handleRequest(err: any, user: any, info: any) {
        const errorInfo = info as Error;

        if (err || !user) {
            // Case A: 토큰 만료
            if (errorInfo?.name === 'TokenExpiredError') {
                throw new BusinessException(ErrorCode.REFRESH_TOKEN_EXPIRED);
            }

            // Case B: 토큰 없음 (쿠키에 없음)
            if (errorInfo?.message === 'No auth token') {
                throw new BusinessException(ErrorCode.REFRESH_TOKEN_MISSING);
            }

            // Case C: 서명 불일치, 형식 오류 등 기타 (JsonWebTokenError)
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return user;
    }
}
