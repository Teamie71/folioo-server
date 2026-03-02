import { Body, Controller, Delete, Get, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UpdateUserNameReqDTO, UserProfileResDTO } from '../application/dtos/user-profile.dto';
import {
    AgreeMarketingReqDTO,
    AgreeMarketingResDTO,
} from '../application/dtos/marketing-agree.dto';
import { User } from 'src/common/decorators/user.decorator';
import { UserService } from '../application/services/user.service';
import { TicketBalanceResDTO } from 'src/modules/ticket/application/dtos/ticket-balance.dto';
import { TicketExpiringResDTO } from 'src/modules/ticket/application/dtos/ticket-expiring.dto';
import { TicketExpiringQueryReqDTO } from 'src/modules/ticket/application/dtos/ticket-expiring-query.dto';
import { UserTicketFacade } from '../application/facades/user-ticket.facade';

@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly userTicketFacade: UserTicketFacade
    ) {}

    @Get('me')
    @ApiOperation({
        summary: '사용자 프로필 조회',
        description: '사용자의 프로필을 조회합니다.',
    })
    @ApiCommonResponse(UserProfileResDTO, {
        exampleResult: {
            name: '폴리오유저',
            socialAccounts: [
                {
                    socialType: 'KAKAO',
                    socialEmail: 'folioo-kakao@example.com',
                },
                {
                    socialType: 'GOOGLE',
                    socialEmail: 'folioo-google@example.com',
                },
            ],
            phoneNum: '01012345678',
            isMarketingAgreed: true,
        },
    })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async getProfile(@User('sub') userId: number): Promise<UserProfileResDTO> {
        return await this.userService.getProfile(userId);
    }

    @Get('me/tickets')
    @ApiOperation({
        summary: '잔여 이용권 조회',
        description: '사용자의 잔여 이용권 수량을 경험 정리, 포트폴리오 첨삭 유형별로 조회합니다.',
    })
    @ApiCommonResponse(TicketBalanceResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getTicketBalance(@User('sub') userId: number): Promise<TicketBalanceResDTO> {
        return this.userTicketFacade.getBalance(userId);
    }

    @Get('me/tickets/expiring')
    @ApiOperation({
        summary: '만료 예정 이용권 조회',
        description:
            '지정한 기간(days) 내 만료 예정인 이용권 수량과 가장 빨리 만료되는 일자를 유형별로 조회합니다.',
    })
    @ApiCommonResponse(TicketExpiringResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getExpiringTickets(
        @User('sub') userId: number,
        @Query() query: TicketExpiringQueryReqDTO
    ): Promise<TicketExpiringResDTO> {
        return this.userTicketFacade.getExpiring(userId, query.days);
    }

    @Patch('me')
    @ApiOperation({
        summary: '사용자 이름/닉네임 변경',
        description: '사용자의 이름/닉네임을 변경합니다.',
    })
    @ApiBody({ type: UpdateUserNameReqDTO })
    @ApiCommonResponse(UserProfileResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async updateProfile(
        @User('sub') userId: number,
        @Body() body: UpdateUserNameReqDTO
    ): Promise<UserProfileResDTO> {
        return this.userService.updateProfile(userId, body.name);
    }

    @Patch('me/marketing-consent')
    @ApiOperation({
        summary: '마케팅 정보 수신 동의 여부 변경',
        description:
            '사용자의 마케팅 정보 수신 동의 여부를 동의 -> 비동의 또는 비동의 -> 동의로 변경합니다.',
    })
    @ApiBody({ type: AgreeMarketingReqDTO })
    @ApiCommonResponse(AgreeMarketingResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND)
    async updateMarketingConsent(
        @User('sub') userId: number,
        @Body() body: AgreeMarketingReqDTO
    ): Promise<AgreeMarketingResDTO> {
        return this.userService.updateMarketingConsent(userId, body.isMarketingAgreed);
    }

    @Delete('me')
    @ApiOperation({
        summary: '회원 탈퇴',
        description:
            '사용자의 계정을 탈퇴 처리하고 연결된 소셜 로그인 계정을 저장된 OAuth 리프레시 토큰 기반으로 연결 해제합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: '회원 탈퇴가 완료되었습니다.',
            },
        },
    })
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.USER_NOT_FOUND,
        ErrorCode.DEACTIVATED_USER,
        ErrorCode.SOCIAL_UNLINK_FAILED
    )
    async withdraw(@User('sub') userId: number): Promise<string> {
        await this.userService.withdraw(userId);
        return '회원 탈퇴가 완료되었습니다.';
    }
}
