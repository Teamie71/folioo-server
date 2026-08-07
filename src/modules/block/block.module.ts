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
        ]),
    ],
})
export class BlockModule {}
