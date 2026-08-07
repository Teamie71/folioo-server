import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import { Block, BLOCK_MAX_LEVEL } from '../../domain/block.entity';
import { BlockKindEntity } from '../../domain/block-kind.entity';
import { ExperienceMeta } from '../../domain/experience-meta.entity';
import { BlockKind, EXPERIENCE_SECTION_KINDS } from '../../domain/enums/block-kind.enum';

@Injectable()
export class BlockService {
    constructor(
        private readonly blockRepository: BlockRepository,
        private readonly blockKindRepository: BlockKindRepository,
        private readonly experienceMetaRepository: ExperienceMetaRepository
    ) {}

    async getTreeByUserId(userId: number): Promise<Block[]> {
        return this.blockRepository.findAllByUserId(userId);
    }

    async getOrCreateRootBlock(userId: number): Promise<Block> {
        const existingRoot = await this.blockRepository.findRootByUserId(userId);
        if (existingRoot) {
            return existingRoot;
        }

        const root = new Block();
        root.userId = userId;
        root.parent = null;
        root.parentId = null;
        root.level = 1;
        root.kind = BlockKind.GROUP_UNCATEGORIZED;
        root.position = 0;
        root.content = null;
        root.placeholder = null;
        return this.blockRepository.save(root);
    }

    async findByIdOrThrow(blockId: string, userId: number): Promise<Block> {
        const block = await this.blockRepository.findByIdAndUserId(blockId, userId);
        if (!block) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_FOUND);
        }
        return block;
    }

    async createBlock(
        userId: number,
        kind: BlockKind,
        parentId: string | null,
        content: string | null
    ): Promise<Block> {
        const parent = parentId ? await this.findByIdOrThrow(parentId, userId) : null;
        this.assertValidPlacement(kind, parent);

        const block = new Block();
        block.userId = userId;
        block.parent = parent;
        block.parentId = parentId;
        block.level = parent ? parent.level + 1 : 1;
        block.kind = kind;
        block.position = await this.blockRepository.countChildren(parentId);
        block.content = content;
        block.placeholder = null;
        const savedBlock = await this.blockRepository.save(block);

        if (kind === BlockKind.EXPERIENCE) {
            await this.provisionExperienceScaffold(savedBlock);
        }

        return savedBlock;
    }

    async updateContent(blockId: string, userId: number, content: string | null): Promise<Block> {
        const block = await this.findByIdOrThrow(blockId, userId);
        const blockKind = await this.getBlockKindOrThrow(block.kind);
        if (!blockKind.isTextEditable) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_EDITABLE);
        }
        block.content = content;
        return this.blockRepository.save(block);
    }

    async deleteBlock(blockId: string, userId: number): Promise<void> {
        const block = await this.findByIdOrThrow(blockId, userId);
        const blockKind = await this.getBlockKindOrThrow(block.kind);
        if (!blockKind.isDeletable) {
            throw new BusinessException(ErrorCode.BLOCK_NOT_DELETABLE);
        }
        await this.blockRepository.deleteById(blockId);
    }

    private async provisionExperienceScaffold(experienceBlock: Block): Promise<void> {
        const sections = EXPERIENCE_SECTION_KINDS.map((sectionKind, index) => {
            const section = new Block();
            section.userId = experienceBlock.userId;
            section.parent = experienceBlock;
            section.parentId = experienceBlock.id;
            section.level = experienceBlock.level + 1;
            section.kind = sectionKind;
            section.position = index;
            section.content = null;
            section.placeholder = null;
            return section;
        });
        await this.blockRepository.saveAll(sections);

        const experienceMeta = new ExperienceMeta();
        experienceMeta.blockId = experienceBlock.id;
        experienceMeta.blockKind = BlockKind.EXPERIENCE;
        await this.experienceMetaRepository.save(experienceMeta);
    }

    private assertValidPlacement(kind: BlockKind, parent: Block | null): void {
        if (kind === BlockKind.GROUP) {
            if (parent !== null) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        if (kind === BlockKind.EXPERIENCE) {
            const validParentKinds: BlockKind[] = [BlockKind.GROUP_UNCATEGORIZED, BlockKind.GROUP];
            if (!parent || !validParentKinds.includes(parent.kind)) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        if (kind === BlockKind.CONTENT) {
            const isSectionParent = parent && EXPERIENCE_SECTION_KINDS.includes(parent.kind);
            const isNestableContentParent =
                parent && parent.kind === BlockKind.CONTENT && parent.level < BLOCK_MAX_LEVEL;
            if (!isSectionParent && !isNestableContentParent) {
                throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
            }
            return;
        }

        throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
    }

    private async getBlockKindOrThrow(kind: BlockKind): Promise<BlockKindEntity> {
        const blockKind = await this.blockKindRepository.findByKind(kind);
        if (!blockKind) {
            throw new BusinessException(ErrorCode.BLOCK_INVALID_PLACEMENT);
        }
        return blockKind;
    }
}
