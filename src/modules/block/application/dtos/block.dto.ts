import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Block, BLOCK_CONTENT_MAX_LENGTH } from '../../domain/block.entity';
import { BlockKind } from '../../domain/enums/block-kind.enum';
import { ExperienceMeta } from '../../domain/experience-meta.entity';
import { ExperienceMap } from '../../domain/experience-map.entity';
import { SourceType } from 'src/modules/portfolio/domain/enums/source-type.enum';
import { PortfolioStatus } from 'src/modules/portfolio/domain/enums/portfolio-status.enum';

export class CreateBlockReqDTO {
    @IsEnum(BlockKind)
    @ApiProperty({ enum: BlockKind, example: BlockKind.GROUP })
    kind: BlockKind;

    @IsOptional()
    @IsString()
    @ApiProperty({
        required: false,
        nullable: true,
        example: null,
        description: '부모 블록 id (루트 GROUP 생성 시 생략)',
    })
    parentId?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(BLOCK_CONTENT_MAX_LENGTH)
    @ApiProperty({ required: false, nullable: true, maxLength: BLOCK_CONTENT_MAX_LENGTH })
    content?: string | null;
}

export class UpdateBlockContentReqDTO {
    @IsOptional()
    @IsString()
    @MaxLength(BLOCK_CONTENT_MAX_LENGTH)
    @ApiProperty({ required: false, nullable: true, maxLength: BLOCK_CONTENT_MAX_LENGTH })
    content?: string | null;
}

export class MoveBlockReqDTO {
    @IsOptional()
    @IsString()
    @ApiProperty({
        required: false,
        nullable: true,
        description:
            '새 부모 블록 id. 생략하면 같은 부모 내에서 순서만 변경한다. 1~2단계 블록은 위계(부모)를 변경할 수 없다.',
    })
    parentId?: string | null;

    @IsInt()
    @Min(0)
    @ApiProperty({ example: 0, minimum: 0, description: '새 부모(또는 기존 부모) 내에서의 순서' })
    position: number;
}

export class ExperienceMetaResDTO {
    @ApiProperty({ required: false, nullable: true })
    contributionRate: number | null;

    @ApiProperty({ enum: SourceType })
    sourceType: SourceType;

    @ApiProperty({ enum: PortfolioStatus })
    status: PortfolioStatus;

    @ApiProperty({ required: false, nullable: true })
    experienceId: number | null;

    static from(experienceMeta: ExperienceMeta): ExperienceMetaResDTO {
        const dto = new ExperienceMetaResDTO();
        dto.contributionRate = experienceMeta.contributionRate;
        dto.sourceType = experienceMeta.sourceType;
        dto.status = experienceMeta.status;
        dto.experienceId = experienceMeta.experienceId;
        return dto;
    }
}

export class BlockResDTO {
    id: string;
    parentId: string | null;
    level: number;
    @ApiProperty({ enum: BlockKind })
    kind: BlockKind;
    position: number;
    content: string | null;
    placeholder: string | null;
    createdAt: string;
    updatedAt: string;
    @ApiProperty({ type: () => ExperienceMetaResDTO, required: false })
    experienceMeta?: ExperienceMetaResDTO;
    @ApiProperty({ type: () => [BlockResDTO] })
    children: BlockResDTO[];

    static fromEntity(block: Block, experienceMeta?: ExperienceMeta): BlockResDTO {
        const dto = new BlockResDTO();
        dto.id = block.id;
        dto.parentId = block.parentId;
        dto.level = block.level;
        dto.kind = block.kind;
        dto.position = block.position;
        dto.content = block.content;
        dto.placeholder = block.placeholder;
        dto.createdAt = block.createdAt.toISOString();
        dto.updatedAt = block.updatedAt.toISOString();
        dto.experienceMeta = experienceMeta ? ExperienceMetaResDTO.from(experienceMeta) : undefined;
        dto.children = [];
        return dto;
    }
}

export class ExperienceMapResDTO {
    @ApiProperty({ description: '낙관적 잠금 버전 (bigint, 문자열로 반환)' })
    mapVersion: string;
    @ApiProperty({ type: () => [BlockResDTO] })
    roots: BlockResDTO[];

    static from(
        experienceMap: ExperienceMap,
        blocks: Block[],
        experienceMetas: ExperienceMeta[]
    ): ExperienceMapResDTO {
        const experienceMetaByBlockId = new Map(
            experienceMetas.map((meta) => [meta.blockId, meta])
        );

        const nodeById = new Map<string, BlockResDTO>();
        const childrenByParentId = new Map<string | null, BlockResDTO[]>();

        for (const block of blocks) {
            const node = BlockResDTO.fromEntity(block, experienceMetaByBlockId.get(block.id));
            nodeById.set(block.id, node);
            const siblings = childrenByParentId.get(block.parentId) ?? [];
            siblings.push(node);
            childrenByParentId.set(block.parentId, siblings);
        }

        for (const node of nodeById.values()) {
            node.children = childrenByParentId.get(node.id) ?? [];
        }

        const dto = new ExperienceMapResDTO();
        dto.mapVersion = experienceMap.mapVersion;
        dto.roots = childrenByParentId.get(null) ?? [];
        return dto;
    }
}
