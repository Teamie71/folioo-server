import { Body, Controller, Get, Header, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'path';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import {
    AdminGrantRewardReqDTO,
    AdminGrantRewardResDTO,
    AdminGrantTicketsReqDTO,
    AdminGrantTicketsResDTO,
    AdminTicketHistoryResDTO,
    AdminUserSearchReqDTO,
    AdminUserSearchResDTO,
} from '../application/dtos/admin-event-reward.dto';
import { AdminEventRewardFacade } from '../application/facades/admin-event-reward.facade';

@ApiTags('Admin')
@Controller('admin')
@Public()
export class AdminEventRewardController {
    constructor(private readonly adminEventRewardFacade: AdminEventRewardFacade) {}

    @Get('dashboard')
    @SkipTransform()
    @Header('Content-Type', 'text/html')
    @ApiOperation({ summary: 'Admin 대시보드 SPA 페이지' })
    getDashboard(@Res() res: Response): void {
        const htmlPath = path.join(__dirname, '..', 'infrastructure', 'views', 'index.html');
        res.sendFile(htmlPath);
    }

    @Get('api/users/search')
    @ApiOperation({ summary: '사용자 검색 (Admin) — 이름/이메일 통합 검색, 빈 값이면 전체 목록' })
    @ApiQuery({
        name: 'keyword',
        type: String,
        required: false,
        description: '검색 키워드 (이름 또는 이메일)',
    })
    @ApiCommonResponse(AdminUserSearchResDTO)
    async searchUsers(@Query() query: AdminUserSearchReqDTO): Promise<AdminUserSearchResDTO> {
        return this.adminEventRewardFacade.searchUsers(query.keyword);
    }

    @Post('api/events/:eventCode/grants')
    @ApiOperation({ summary: '이벤트 보상 수동 지급 (Admin, userId 기반)' })
    @ApiBody({ type: AdminGrantRewardReqDTO })
    @ApiCommonResponse(AdminGrantRewardResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.EVENT_NOT_FOUND,
        ErrorCode.EVENT_NOT_ACTIVE,
        ErrorCode.EVENT_MANUAL_REWARD_NOT_ALLOWED,
        ErrorCode.EVENT_REWARD_ALREADY_GRANTED,
        ErrorCode.EVENT_FEEDBACK_ALREADY_PROCESSED,
        ErrorCode.USER_NOT_FOUND
    )
    async grantReward(
        @Param('eventCode') eventCode: string,
        @Body() body: AdminGrantRewardReqDTO
    ): Promise<AdminGrantRewardResDTO> {
        return this.adminEventRewardFacade.grantReward(eventCode, body);
    }

    @Post('api/tickets/grant')
    @ApiOperation({ summary: '이용권 수동 지급 (Admin)' })
    @ApiBody({ type: AdminGrantTicketsReqDTO })
    @ApiCommonResponse(AdminGrantTicketsResDTO)
    @ApiCommonErrorResponse(ErrorCode.USER_NOT_FOUND)
    async grantTickets(@Body() body: AdminGrantTicketsReqDTO): Promise<AdminGrantTicketsResDTO> {
        return this.adminEventRewardFacade.grantTickets(body);
    }

    @Get('api/tickets/history')
    @ApiOperation({ summary: '이용권 거래 내역 (Admin)' })
    @ApiCommonResponse(AdminTicketHistoryResDTO)
    async getTicketHistory(): Promise<AdminTicketHistoryResDTO> {
        return this.adminEventRewardFacade.getTicketHistory();
    }
}
