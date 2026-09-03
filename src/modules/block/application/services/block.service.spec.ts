import { Test } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { BlockService } from './block.service';
import { BlockRepository } from '../../infrastructure/repositories/block.repository';
import { BlockKindRepository } from '../../infrastructure/repositories/block-kind.repository';
import { ExperienceMetaRepository } from '../../infrastructure/repositories/experience-meta.repository';
import { Block } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';

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

describe('BlockService.moveBlock', () => {
    let service: BlockService;
    let blockRepository: jest.Mocked<BlockRepository>;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                BlockService,
                {
                    provide: BlockRepository,
                    useValue: {
                        findByIdAndUserId: jest.fn(),
                        findAllByUserId: jest.fn(),
                        saveAll: jest.fn((blocks: Block[]) => Promise.resolve(blocks)),
                    },
                },
                { provide: BlockKindRepository, useValue: {} },
                { provide: ExperienceMetaRepository, useValue: {} },
            ],
        }).compile();

        service = moduleRef.get(BlockService);
        blockRepository = moduleRef.get(BlockRepository);
    });

    it('1단계(그룹) 블록의 부모 변경은 거부한다', async () => {
        const group = makeBlock({ id: '1', level: 1, kind: BlockKind.GROUP, parentId: null });
        const otherGroup = makeBlock({ id: '2', level: 1, kind: BlockKind.GROUP, parentId: null });
        blockRepository.findByIdAndUserId.mockResolvedValue(group);
        blockRepository.findAllByUserId.mockResolvedValue([group, otherGroup]);

        await expect(service.moveBlock('1', 1, '2', 0)).rejects.toEqual(
            new BusinessException(ErrorCode.BLOCK_LEVEL_LOCKED)
        );
    });

    it('2단계(활동) 블록은 다른 그룹으로 이동할 수 있다', async () => {
        const sourceGroup = makeBlock({ id: '10', level: 1, kind: BlockKind.GROUP });
        const targetGroup = makeBlock({ id: '20', level: 1, kind: BlockKind.GROUP });
        const experience = makeBlock({
            id: '30',
            level: 2,
            kind: BlockKind.EXPERIENCE,
            parentId: '10',
        });
        blockRepository.findByIdAndUserId.mockResolvedValue(experience);
        blockRepository.findAllByUserId.mockResolvedValue([sourceGroup, targetGroup, experience]);

        const moved = await service.moveBlock('30', 1, '20', 0);

        expect(moved.parentId).toBe('20');
        expect(moved.level).toBe(2);
    });
});
