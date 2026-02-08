import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UpdateUserNameReqDTO, UserProfileResDTO } from '../application/dtos/user-profile.dto';
import {
    AgreeMarketingReqDTO,
    AgreeMarketingResDTO,
} from '../application/dtos/marketing-agree.dto';
import { User } from 'src/common/decorators/user.decorator';
import { UserService } from '../application/services/user.service';

@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @ApiOperation({
        summary: '사용자 프로필 조회',
        description: '사용자의 프로필을 조회합니다.',
    })
    @ApiCommonResponse(UserProfileResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getProfile(@User('sub') userId: number): Promise<UserProfileResDTO> {
        return await this.userService.getProfile(userId);
    }

    @Patch('me')
    @ApiOperation({
        summary: '사용자 이름/닉네임 변경',
        description: '사용자의 이름/닉네임을 변경합니다.',
    })
    @ApiBody({ type: UpdateUserNameReqDTO })
    @ApiCommonResponse(UserProfileResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    updateProfile(@Body() body: UpdateUserNameReqDTO): UserProfileResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

    @Patch('me/marketing-consent')
    @ApiOperation({
        summary: '마케팅 정보 수신 동의 여부 변경',
        description:
            '사용자의 마케팅 정보 수신 동의 여부를 동의 -> 비동의 또는 비동의 -> 동의로 변경합니다.',
    })
    @ApiBody({ type: AgreeMarketingReqDTO })
    @ApiCommonResponse(AgreeMarketingResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    updateMarketingConsent(@Body() body: AgreeMarketingReqDTO): AgreeMarketingResDTO {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }
}
