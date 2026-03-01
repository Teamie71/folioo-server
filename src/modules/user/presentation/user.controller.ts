import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
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
    @ApiCommonResponse(UserProfileResDTO)
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
}
