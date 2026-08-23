import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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

    async findAllByParentId(parentId: string): Promise<Block[]> {
        return this.blockRepository.find({
            where: { parentId },
            order: { position: 'ASC' },
        });
    }

    async countChildren(userId: number, parentId: string | null): Promise<number> {
        return this.blockRepository.count({ where: { userId, parentId: parentId ?? IsNull() } });
    }

    async deleteById(id: string): Promise<void> {
        await this.blockRepository.delete(id);
    }

    async findByIdsAndUserId(ids: string[], userId: number): Promise<Block[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.blockRepository.find({ where: { id: In(ids), userId } });
    }

    // parent_id에 ON DELETE CASCADE가 걸려 있어 조상 id 하나만 지워도 하위 트리가 함께 삭제된다.
    // 목록에 자식 id가 섞여 있어도 이미 지워진 행은 그냥 매칭되지 않을 뿐이라 순서를 신경 쓸 필요 없다.
    async deleteByIds(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        await this.blockRepository.delete(ids);
    }
}
