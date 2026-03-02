import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiCommonErrorResponse, ApiCommonResponse } from 'src/common/decorators/swagger.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { InternalHealthResDTO } from '../application/dtos/internal-health.dto';
import { InternalApiKeyGuard } from '../infrastructure/guards/internal-api-key.guard';

@ApiTags('Internal')
@Controller('api/v1/internal')
export class InternalController {
    @Get('health')
    @Public()
    @UseGuards(InternalApiKeyGuard)
    @ApiHeader({
        name: 'X-API-Key',
        required: true,
        description: 'Internal API key for AI server callbacks',
    })
    @ApiOperation({
        summary: 'Internal API health check',
        description: 'Verifies internal API key authentication and routing.',
    })
    @ApiCommonResponse(InternalHealthResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    getHealth(): InternalHealthResDTO {
        return InternalHealthResDTO.ok();
    }
}
