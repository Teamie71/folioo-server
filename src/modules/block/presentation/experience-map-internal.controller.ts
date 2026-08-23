import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { ApiCommonErrorResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { TemplateCatalogService } from '../application/services/template-catalog.service';
import { InternalTemplateCatalogResDTO } from '../application/dtos/internal-template.dto';

// 경로는 docs/development/INTERNAL_API_PATTERN.md의 `/internal/*` 규칙을 따르지 않고
// AI 서버와 고정된 계약 경로(`/api/v1/experience-map/*`)를 그대로 쓴다.
// 인증(X-API-Key)과 컨트롤러 분리(공개 컨트롤러에 섞지 않음) 원칙은 그대로 지킨다.
@ApiTags('ExperienceMap - Internal (AI)')
@Controller('api/v1/experience-map')
export class ExperienceMapInternalController {
    constructor(private readonly templateCatalogService: TemplateCatalogService) {}

    @Get('templates')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @SkipTransform()
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'AI 서버 콜백용 내부 API 키 (MAIN_BACKEND_API_KEY)',
    })
    @ApiOperation({
        summary: '블록 템플릿 카탈로그 조회 (AI 서버용)',
        description:
            'AI 서버가 기동 시 1회 조회 후 1시간 TTL로 캐시한다. ' +
            'unknown_slot_id(422) 응답을 받으면 즉시 재조회한다. ' +
            '문구가 바뀌면 version이 갱신된다.',
    })
    @ApiResponse({ status: 200, type: InternalTemplateCatalogResDTO })
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getTemplates(): InternalTemplateCatalogResDTO {
        return this.templateCatalogService.getInternalCatalog();
    }
}
