import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import { SendSmsReqDto, VerifySmsReqDto } from '../application/dtos/sms-auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
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
    @Get('kakao')
    kakaoLogin(
        @Query('redirect_url') redirect_url?: string,
        @Query('redirect_path') redirect_path?: string
    ) {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, {
            url: redirect_url,
            path: redirect_path,
        });
    }

    @ApiOperation({
        summary: '카카오 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    @Get('kakao/callback')
    kakaoCallback(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Post('kakao/unlink')
    kakaoUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Get('google')
    googleLogin(
        @Query('redirect_url') redirect_url?: string,
        @Query('redirect_path') redirect_path?: string
    ) {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, {
            url: redirect_url,
            path: redirect_path,
        });
    }

    @ApiOperation({
        summary: '구글 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    @Get('google/callback')
    googleCallback(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Post('google/unlink')
    googleUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Get('naver')
    naverLogin(
        @Query('redirect_url') redirect_url?: string,
        @Query('redirect_path') redirect_path?: string
    ) {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, {
            url: redirect_url,
            path: redirect_path,
        });
    }

    @ApiOperation({
        summary: '네이버 로그인 콜백',
        description:
            '로그인 로직이 이루어지고 프론트로 리다이렉트됩니다. 스웨거에서 누르지 마세요.',
    })
    @ApiResponse({
        status: 302,
        description: '프론트엔드 페이지로 리다이렉트됨',
    })
    @Get('naver/callback')
    naverCallback(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Post('naver/unlink')
    naverUnlink(): Promise<void> {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @ApiOperation({
        summary: '토큰 재발급',
        description: '유효한 refreshToken을 사용해 accessToken을 재발급 받습니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: 'Generate New AccessToken',
            },
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @Post('refresh')
    handleRefresh() {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @Post('logout')
    handleLogout() {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

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
    @ApiBody({ type: SendSmsReqDto })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @ApiCommonErrorResponse(ErrorCode.ALREADY_VERIFY_USER)
    @Post('sms/send')
    handleSmsSend(@Body() body: SendSmsReqDto): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

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
    @ApiBody({ type: VerifySmsReqDto })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @ApiCommonErrorResponse(ErrorCode.SMS_CODE_MISMATCH)
    @ApiCommonErrorResponse(ErrorCode.SMS_CODE_NOT_FOUND)
    @Post('sms/verify')
    handleSmsVerify(@Body() body: VerifySmsReqDto): string {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }
}
