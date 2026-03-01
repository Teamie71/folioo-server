import {
    Body,
    Controller,
    Get,
    Headers,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { SendSmsReqDTO, VerifySmsReqDTO } from '../application/dtos/sms-auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { SocialUser } from 'src/common/decorators/social-user.decorator';
import type { SocialUserAfterOAuth, UserAfterAuth } from '../domain/types/jwt-payload.type';
import type { Request, Response } from 'express';
import { LoginUsecase } from '../application/usecases/login.usecase';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtRefreshGuard } from '../infrastructure/guards/jwt-refresh.guard';
import { TokenService } from '../infrastructure/services/token.service';
import { User } from 'src/common/decorators/user.decorator';
import { StringValue } from 'ms';
import { TimeUtil } from 'src/common/utils/time.util';
import { LogoutUsecase } from '../application/usecases/logout.usecase';
import { extractAccessTokenFromAuthorization } from '../infrastructure/utils/access-token.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly configService: ConfigService,
        private readonly loginUsecase: LoginUsecase,
        private readonly tokenService: TokenService,
        private readonly logoutUsecase: LogoutUsecase
    ) {}

    @Get('kakao')
    @Public()
    @UseGuards(AuthGuard('kakao'))
    @ApiOperation({
        summary: '카카오 로그인 트리거',
        description: '카카오 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '카카오 로그인 페이지로 리다이렉트됨.',
    })
    async kakaoLogin() {}

    @Get('kakao/callback')
    @Public()
    @UseGuards(AuthGuard('kakao'))
    @ApiOperation({
        summary: '카카오 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    async kakaoCallback(
        @SocialUser() user: SocialUserAfterOAuth,
        @Res() res: Response
    ): Promise<void> {
        const refreshToken = await this.loginUsecase.execute(user);
        const expiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
            '14d') as StringValue;
        const isLocal = this.configService.get<string>('APP_PROFILE', 'local') === 'local';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: !isLocal,
            sameSite: isLocal ? 'lax' : 'none',
            path: '/',
            maxAge: TimeUtil.toMs(expiresIn),
        });
        const clientUrl = this.configService.getOrThrow<string>('CLIENT_REDIRECT_URI');
        res.redirect(`${clientUrl}?status=success`);
    }

    @Post('kakao/unlink')
    @ApiOperation({
        summary: '서비스 내 카카오 로그인 사용자 탈퇴',
        description: '카카오 연결을 끊고, 서비스 내 계정을 비활성화합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'Unlinked & Deactivated',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    kakaoUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Get('google')
    @Public()
    @UseGuards(AuthGuard('google'))
    @ApiOperation({
        summary: '구글 로그인 트리거',
        description: '구글 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '구글 로그인 페이지로 리다이렉트됨.',
    })
    async googleLogin() {}

    @Get('google/callback')
    @Public()
    @UseGuards(AuthGuard('google'))
    @ApiOperation({
        summary: '구글 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    async googleCallback(
        @SocialUser() user: SocialUserAfterOAuth,
        @Res() res: Response
    ): Promise<void> {
        const refreshToken = await this.loginUsecase.execute(user);
        const expiresIn = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
            '14d') as StringValue;
        const isLocal = this.configService.get<string>('APP_PROFILE', 'local') === 'local';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: !isLocal,
            sameSite: isLocal ? 'lax' : 'none',
            path: '/',
            maxAge: TimeUtil.toMs(expiresIn),
        });
        const clientUrl = this.configService.getOrThrow<string>('CLIENT_REDIRECT_URI');
        res.redirect(`${clientUrl}?status=success`);
    }

    @Post('google/unlink')
    @ApiOperation({
        summary: '서비스 내 구글 로그인 사용자 탈퇴',
        description: '구글 연결을 끊고, 서비스 내 계정을 비활성화합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'Unlinked & Deactivated',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    googleUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Get('naver')
    @Public()
    @ApiOperation({
        summary: '네이버 로그인 트리거',
        description: '네이버 인증페이지로 리다이렉트합니다. 스웨거에서 누르지 마세요.',
    })
    @ApiQuery({
        name: 'redirect_url',
        description: '리다이렉트 될 base_url을 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiQuery({
        name: 'redirect_path',
        description: '리다이렉트 될 uri path를 쿼리 파라미터로 포함합니다.',
        required: false,
    })
    @ApiResponse({
        status: 302,
        description: '네이버 로그인 페이지로 리다이렉트됨.',
    })
    naverLogin(
        @Query('redirect_url') redirect_url?: string,
        @Query('redirect_path') redirect_path?: string
    ) {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, {
            url: redirect_url,
            path: redirect_path,
        });
    }

    @Get('naver/callback')
    @Public()
    @ApiOperation({
        summary: '네이버 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    naverCallback(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Post('naver/unlink')
    @ApiOperation({
        summary: '서비스 내 네이버 로그인 사용자 탈퇴',
        description: '네이버 연결을 끊고, 서비스 내 계정을 비활성화합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'Unlinked & Deactivated',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    naverUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @Post('refresh')
    @Public()
    @UseGuards(JwtRefreshGuard)
    @ApiOperation({
        summary: '토큰 재발급',
        description: '유효한 refreshToken을 사용해 accessToken을 발급 받습니다.',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'new AccessToken',
            },
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        ErrorCode.REFRESH_TOKEN_MISSING,
        ErrorCode.INVALID_REFRESH_TOKEN
    )
    async handleRefresh(@User() user: UserAfterAuth) {
        const accessToken = await this.tokenService.generateAccessToken({
            sub: user.sub,
        });
        return accessToken;
    }

    @Post('logout')
    @ApiOperation({
        summary: '로그아웃',
        description: 'JWT 토큰을 만료시키고 서버에서 로그아웃을 수행합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'Logout from Server',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async handleLogout(
        @Headers('authorization') authorization: string | undefined,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response
    ): Promise<string> {
        const refreshToken = req.cookies?.refreshToken as string | undefined;
        const accessToken = extractAccessTokenFromAuthorization(authorization);

        if (!accessToken) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        await this.logoutUsecase.execute({
            accessToken,
            refreshToken: refreshToken ?? null,
        });

        const isLocal = this.configService.get<string>('APP_PROFILE', 'local') === 'local';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: !isLocal,
            sameSite: isLocal ? 'lax' : 'none',
            path: '/',
        });

        return 'Logout from Server';
    }

    @Post('sms/send')
    @ApiOperation({
        summary: '전화번호 인증번호 발송',
        description: '전화번호 인증번호를 발송합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '인증번호가 성공적으로 발송되었습니다.',
            },
        },
    })
    @ApiBody({ type: SendSmsReqDTO })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.ALREADY_VERIFY_USER)
    handleSmsSend(@Body() body: SendSmsReqDTO): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

    @Post('sms/verify')
    @ApiOperation({
        summary: '전화번호 인증번호 검증',
        description: '발송된 인증정보가 올바른지 확인합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '전화번호 인증이 완료되었습니다.',
            },
        },
    })
    @ApiBody({ type: VerifySmsReqDTO })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.SMS_CODE_MISMATCH,
        ErrorCode.SMS_CODE_NOT_FOUND
    )
    handleSmsVerify(@Body() body: VerifySmsReqDTO): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }
}
