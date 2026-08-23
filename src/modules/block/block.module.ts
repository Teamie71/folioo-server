import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './domain/block.entity';
import { BlockKindEntity } from './domain/block-kind.entity';
import { ExperienceMeta } from './domain/experience-meta.entity';
import { Review } from './domain/review.entity';
import { ExperienceMap } from './domain/experience-map.entity';
import { AiExperienceSession } from './domain/ai-experience-session.entity';
import { AiExperienceRequest } from './domain/ai-experience-request.entity';
import { AiCommitLog } from './domain/ai-commit-log.entity';
import { AiCommitRequest } from './domain/ai-commit-request.entity';
import { BlockRepository } from './infrastructure/repositories/block.repository';
import { BlockKindRepository } from './infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from './infrastructure/repositories/experience-meta.repository';
import { ExperienceMapRepository } from './infrastructure/repositories/experience-map.repository';
import { AiCommitRequestRepository } from './infrastructure/repositories/ai-commit-request.repository';
import { BlockService } from './application/services/block.service';
import { ExperienceMapService } from './application/services/experience-map.service';
import { ExperienceMetaService } from './application/services/experience-meta.service';
import { ExperienceMapFacade } from './application/facades/experience-map.facade';
import { ExperienceMapController } from './presentation/experience-map.controller';
import { TemplateCatalogService } from './application/services/template-catalog.service';
import { TemplateController } from './presentation/template.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Block,
            BlockKindEntity,
            ExperienceMeta,
            Review,
            ExperienceMap,
            AiExperienceSession,
            AiExperienceRequest,
            AiCommitLog,
            AiCommitRequest,
        ]),
    ],
    controllers: [ExperienceMapController, TemplateController],
    providers: [
        BlockRepository,
        BlockKindRepository,
        ExperienceMetaRepository,
        ExperienceMapRepository,
        AiCommitRequestRepository,
        BlockService,
        ExperienceMapService,
        ExperienceMetaService,
        ExperienceMapFacade,
        TemplateCatalogService,
    ],
})
export class BlockModule {}
