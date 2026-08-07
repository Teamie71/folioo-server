import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';

@Injectable()
export class BlockRepository {
    constructor(
        @InjectRepository(Block)
        private readonly blockRepository: Repository<Block>
    ) {}

    save(block: Block): Promise<Block> {
        return this.blockRepository.save(block);
    }

    saveAll(blocks: Block[]): Promise<Block[]> {
        return this.blockRepository.save(blocks);
    }

    async findByIdAndUserId(id: string, userId: number): Promise<Block | null> {
        return this.blockRepository.findOne({ where: { id, userId } });
    }

    async findRootByUserId(userId: number): Promise<Block | null> {
        return this.blockRepository.findOne({
            where: { userId, kind: BlockKind.GROUP_UNCATEGORIZED, parentId: IsNull() },
        });
    }

    async findAllByUserId(userId: number): Promise<Block[]> {
        return this.blockRepository.find({
            where: { userId },
            order: { level: 'ASC', position: 'ASC' },
        });
    }

    async countChildren(parentId: string | null): Promise<number> {
        return this.blockRepository.count({ where: { parentId: parentId ?? IsNull() } });
    }

    async deleteById(id: string): Promise<void> {
        await this.blockRepository.delete(id);
    }
}
