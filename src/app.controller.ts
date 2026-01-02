import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Common')
@Controller()
export class AppController {
    @ApiOperation({
        summary: '서버 상태 확인',
        description:
            '로드밸런서가 서버 상태를 확인할 때 사용하는 헬스체크용 API입니다. 로그인 없이도 테스트 가능합니다.',
    })
    @ApiOkResponse({
        schema: {
            example: {
                timestamp: '2026-01-02T14:56:23.295Z',
                isSuccess: true,
                error: null,
                result: "I'm Healthy",
            },
        },
    })
    @Get('health')
    getHello(): string {
        return "I'm Healthy";
    }
}
