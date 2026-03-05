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
    AdminUserSearchReqDTO,
    AdminUserSearchResDTO,
} from '../application/dtos/admin-event-reward.dto';
import { AdminEventRewardFacade } from '../application/facades/admin-event-reward.facade';

@ApiTags('Admin')
@Controller('admin')
@Public()
export class AdminEventRewardController {
    constructor(private readonly adminEventRewardFacade: AdminEventRewardFacade) {}

    @Get('event-rewards')
    @SkipTransform()
    @Header('Content-Type', 'text/html')
    @ApiOperation({ summary: 'Admin 이벤트 보상 지급 대시보드 HTML 페이지' })
    getPage(@Res() res: Response): void {
        const htmlPath = path.join(__dirname, '..', 'infrastructure', 'views', 'event-reward.html');
        res.sendFile(htmlPath);
    }

    @Get('api/users/search')
    @ApiOperation({ summary: '사용자 이름 검색 (Admin)' })
    @ApiQuery({ name: 'name', type: String, description: '검색할 사용자 이름' })
    @ApiCommonResponse(AdminUserSearchResDTO)
    async searchUsers(@Query() query: AdminUserSearchReqDTO): Promise<AdminUserSearchResDTO> {
        return this.adminEventRewardFacade.searchUsers(query.name);
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
}
