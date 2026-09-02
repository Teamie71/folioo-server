import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { JobSearchSessionService } from '../application/services/job-search-session.service';
import { JobSearchStatusResDTO } from '../application/dtos/job-search.dto';

@ApiTags('JobSearch')
@Controller('job-search')
export class JobSearchController {
    constructor(private readonly jobSearchSessionService: JobSearchSessionService) {}

    @Get('status')
    @ApiOperation({
        summary: '직무 찾기 실행 여부 조회',
        description: '로그인한 사용자 계정 기준으로 완료된 직무 찾기 결과가 있는지 확인합니다.',
    })
    @ApiCommonResponse(JobSearchStatusResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getStatus(@User('sub') userId: number): Promise<JobSearchStatusResDTO> {
        const session = await this.jobSearchSessionService.getStatusForUser(userId);
        return JobSearchStatusResDTO.from(session);
    }
}
