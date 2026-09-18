import { Test } from '@nestjs/testing';
import { BlockCommitService } from './block-commit.service';
import { BlockService } from './block.service';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';
import { CommitItemAction } from '../dtos/experience-map-commit.dto';

function makeBlock(overrides: Partial<Block>): Block {
    return {
        id: '1',
        userId: 1,
        parent: null,
        parentId: null,
        level: 1,
        kind: BlockKind.GROUP,
        position: 0,
        content: null,
        placeholder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as Block;
}

describe('BlockCommitService.execute (update)', () => {
    let service: BlockCommitService;
    let saveAll: jest.Mock;

    const tree = (): Block[] => [
        makeBlock({ id: '10', level: 2, kind: BlockKind.EXPERIENCE, content: '활동' }),
        makeBlock({ id: '20', parentId: '10', level: 3, kind: BlockKind.SECTION_DETAIL }),
        makeBlock({
            id: '30',
            parentId: '20',
            level: 4,
            kind: BlockKind.CONTENT,
            content: '원래 값',
        }),
    ];

    beforeEach(async () => {
        saveAll = jest.fn((blocks: Block[]) => Promise.resolve(blocks));
        const moduleRef = await Test.createTestingModule({
            providers: [
                BlockCommitService,
                { provide: BlockService, useValue: {} },
                {
                    provide: BlockRepository,
                    useValue: { saveAll },
                },
                { provide: BlockKindRepository, useValue: {} },
            ],
        }).compile();

        service = moduleRef.get(BlockCommitService);
    });

    it('update만 있는 커밋도 수정된 블록을 저장한다', async () => {
        await service.execute(
            1,
            [
                {
                    item_id: 'it_1',
                    action: CommitItemAction.UPDATE,
                    target_id: '30',
                    content: '새 값',
                },
            ],
            tree()
        );

        expect(saveAll).toHaveBeenCalledWith([
            expect.objectContaining({ id: '30', content: '새 값' }),
        ]);
    });

    it('같은 블록을 두 번 수정해도 되돌리기 기준은 커밋 이전 값이다', async () => {
        const result = await service.execute(
            1,
            [
                { item_id: 'it_1', action: CommitItemAction.UPDATE, target_id: '30', content: 'A' },
                { item_id: 'it_2', action: CommitItemAction.UPDATE, target_id: '30', content: 'B' },
            ],
            tree()
        );

        expect(result.updatedBlocksPreviousContent).toEqual({ '30': '원래 값' });
    });
});
