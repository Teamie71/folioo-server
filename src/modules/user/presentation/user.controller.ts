import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { UpdateUserNameReqDto, UserProfileResDto } from '../application/dtos/user-profile.dto';
import {
    AgreeMarketingReqDto,
    AgreeMarketingResDto,
} from '../application/dtos/marketing-agree.dto';

@ApiTags('User')
@Controller('users')
export class UserController {
    @ApiOperation({
        summary: '사용자 프로필 조회',
        description: '사용자의 프로필을 조회합니다.',
    })
    @ApiCommonResponse(UserProfileResDto)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @Get('profile')
    getProfile(): UserProfileResDto {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED);
    }

    @ApiOperation({
        summary: '사용자 이름/닉네임 변경',
        description: '사용자의 이름/닉네임을 변경합니다.',
    })
    @ApiBody({ type: UpdateUserNameReqDto })
    @ApiCommonResponse(UserProfileResDto)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @Patch('profile')
    updateProfile(@Body() body: UpdateUserNameReqDto): UserProfileResDto {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }

    @ApiOperation({
        summary: '마케팅 정보 수신 동의 여부 변경',
        description:
            '사용자의 마케팅 정보 수신 동의 여부를 동의 -> 비동의 또는 비동의 -> 동의로 변경합니다.',
    })
    @ApiBody({ type: AgreeMarketingReqDto })
    @ApiCommonResponse(AgreeMarketingResDto)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    @Patch('me/marketing-consent')
    updateMarketingConsent(@Body() body: AgreeMarketingReqDto): AgreeMarketingResDto {
        throw new BusinessException(ErrorCode.NOT_IMPLEMENTED, body);
    }
}
