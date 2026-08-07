import { Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { BlockService } from '../services/block.service';
import { ExperienceMapService } from '../services/experience-map.service';
import { ExperienceMetaService } from '../services/experience-meta.service';
import {
    BlockResDTO,
    CreateBlockReqDTO,
    ExperienceMapResDTO,
    UpdateBlockContentReqDTO,
} from '../dtos/block.dto';
import { BlockKind } from '../../domain/enums/block-kind.enum';

@Injectable()
export class ExperienceMapFacade {
    constructor(
        private readonly blockService: BlockService,
        private readonly experienceMapService: ExperienceMapService,
        private readonly experienceMetaService: ExperienceMetaService
    ) {}

    @Transactional()
    async getMap(userId: number): Promise<ExperienceMapResDTO> {
        await this.blockService.getOrCreateRootBlock(userId);
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        const blocks = await this.blockService.getTreeByUserId(userId);
        const experienceBlockIds = blocks
            .filter((block) => block.kind === BlockKind.EXPERIENCE)
            .map((block) => block.id);
        const experienceMetas =
            await this.experienceMetaService.findAllByBlockIds(experienceBlockIds);
        return ExperienceMapResDTO.from(experienceMap, blocks, experienceMetas);
    }

    @Transactional()
    async createBlock(userId: number, body: CreateBlockReqDTO): Promise<BlockResDTO> {
        await this.blockService.getOrCreateRootBlock(userId);
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        const block = await this.blockService.createBlock(
            userId,
            body.kind,
            body.parentId ?? null,
            body.content ?? null
        );
        await this.experienceMapService.bumpVersion(experienceMap);
        return BlockResDTO.fromEntity(block);
    }

    @Transactional()
    async updateBlockContent(
        userId: number,
        blockId: string,
        body: UpdateBlockContentReqDTO
    ): Promise<BlockResDTO> {
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        const block = await this.blockService.updateContent(blockId, userId, body.content ?? null);
        await this.experienceMapService.bumpVersion(experienceMap);
        return BlockResDTO.fromEntity(block);
    }

    @Transactional()
    async deleteBlock(userId: number, blockId: string): Promise<void> {
        const experienceMap = await this.experienceMapService.getOrCreate(userId);
        await this.blockService.deleteBlock(blockId, userId);
        await this.experienceMapService.bumpVersion(experienceMap);
    }
}
