import { Controller, Get, Param, ParseIntPipe, UseFilters, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { SkipTransform } from 'src/common/decorators/skip-transform.decorator';
import { AiClientExceptionFilter } from 'src/common/filters/ai-client-exception.filter';
import { InternalApiKeyGuard } from 'src/common/guards/internal-api-key.guard';
import { PortfolioService } from 'src/modules/portfolio/application/services/portfolio.service';
import { InternalPortfolioDetailResDTO } from '../application/dtos/internal-portfolio.dto';

@ApiExcludeController()
@Public()
@SkipTransform()
@UseFilters(AiClientExceptionFilter)
@UseGuards(InternalApiKeyGuard)
@Controller('api/portfolios')
export class AiPortfolioCompatController {
    constructor(private readonly portfolioService: PortfolioService) {}

    @Get(':portfolioId')
    async getPortfolio(
        @Param('portfolioId', ParseIntPipe) portfolioId: number
    ): Promise<InternalPortfolioDetailResDTO> {
        const portfolio = await this.portfolioService.findByIdWithExperienceOrThrow(portfolioId);
        return InternalPortfolioDetailResDTO.from(portfolio);
    }
}
