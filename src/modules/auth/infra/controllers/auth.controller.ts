import { Body, Controller, Get, Post, Query, Res, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { KakaoLoginUseCase } from '../../application/usecases/kakao-login.usecase';
import { RefreshUseCase } from '../../application/usecases/refresh.usecase';
import { LogoutUseCase } from '../../application/usecases/logout.usecase';
import { UnlinkUseCase } from '../../application/usecases/unlink.usecase';
import { JwtAccessGuard } from '../guards/jwt-access.guard';

@ApiTags('Auth')
@Controller('auth')
@ApiBearerAuth('accessToken')
export class AuthController {
    constructor(
        private readonly kakaoLogin: KakaoLoginUseCase,
        private readonly refresh: RefreshUseCase,
        private readonly logout: LogoutUseCase,
        private readonly unlink: UnlinkUseCase
    ) {}

    @ApiOperation({
        summary: '카카오 로그인 트리거',
        description:
            '카카오 인증페이지로 리다이렉트합니다.[여기를 클릭하여 카카오 로그인 시작](http://localhost:3000/auth/kakao)',
    })
    @ApiResponse({ status: 302, description: 'Kakao authorize redirect' })
    @Get('kakao')
    kakaoRedirect(@Res() res: Response) {
        const redirectUri = encodeURIComponent(process.env.KAKAO_REDIRECT_URI!);
        const clientId = process.env.KAKAO_REST_API_KEY!;
        const url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
        return res.redirect(url);
    }

    @ApiOperation({
        summary: '카카오 콜백',
        description:
            '로그인 처리 후 HttpOnly 쿠키 세팅하고 프론트로 리다이렉트. Swagger에서 누르지 마세요.',
    })
    @ApiResponse({ status: 302, description: 'Front redirect with cookies' })
    @Get('kakao/callback')
    async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
        const result = await this.kakaoLogin.execute({
            code,
            redirectUri: process.env.KAKAO_REDIRECT_URI!,
        });

        const isProd = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: isProd, // 로컬 http면 false
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60,
        });
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        return res.redirect(process.env.CLIENT_REDIRECT_URI || 'http://localhost:3000');
    }

    //  Swagger 테스트용
    @ApiOperation({
        summary: '[DEV] 카카오 code → 토큰(JSON)',
        description: 'Swagger 테스트용. code를 JSON으로 받아 토큰을 JSON으로 반환',
    })
    @ApiOkResponse({ description: 'BaseResponse 자동 래핑됨' })
    @Get('kakao/exchange')
    async kakaoExchange(@Query('code') code: string) {
        return this.kakaoLogin.execute({
            code,
            redirectUri: process.env.KAKAO_REDIRECT_URI!,
        });
    }

    @ApiOperation({
        summary: '토큰 재발급',
        description: 'refreshToken으로 access/refresh 재발급(회전)',
    })
    @ApiOkResponse({ description: 'BaseResponse 자동 래핑됨' })
    @Post('refresh')
    @ApiBearerAuth('refreshToken')
    async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.refreshToken;
        const result = await this.refresh.execute({ refreshToken });

        const isProd = process.env.NODE_ENV === 'production';

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60,
        });
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        return { message: 'refreshed' };
    }

    @UseGuards(JwtAccessGuard)
    @ApiOperation({ summary: '로그아웃', description: 'refresh 저장 삭제 + 쿠키 제거' })
    @ApiOkResponse({ description: 'BaseResponse 자동 래핑됨' })
    @Post('logout')
    async logoutApi(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        await this.logout.execute({ userId: req.user.userId });

        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        });

        return { message: 'logged out' };
    }

    @UseGuards(JwtAccessGuard)
    @ApiOperation({
        summary: '회원탈퇴(카카오 unlink 포함)',
        description: '카카오 연결끊기 + refresh 삭제 + user 비활성화(isActive=false)',
    })
    @ApiOkResponse({ description: 'BaseResponse 자동 래핑됨' })
    @Post('unlink')
    async unlinkApi(@Req() req: any, @Res({ passthrough: true }) res: Response) {
        const result = await this.unlink.execute({ userId: req.user.userId });

        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
        });

        return result;
    }
}
