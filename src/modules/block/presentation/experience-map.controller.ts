import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ApiCommonErrorResponse,
    ApiCommonMessageResponse,
    ApiCommonResponse,
} from 'src/common/decorators/swagger.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ErrorCode } from 'src/common/exceptions/error-code.enum';
import { ExperienceMapFacade } from '../application/facades/experience-map.facade';
import {
    BlockResDTO,
    CreateBlockReqDTO,
    ExperienceMapResDTO,
    MoveBlockReqDTO,
    UpdateBlockContentReqDTO,
} from '../application/dtos/block.dto';

@ApiTags('ExperienceMap')
@Controller('experience-map')
export class ExperienceMapController {
    constructor(private readonly experienceMapFacade: ExperienceMapFacade) {}

    @Get()
    @ApiOperation({
        summary: '경험 정리 구조화 맵 조회',
        description:
            '사용자의 블록 트리 전체를 조회합니다. 최초 조회 시 미분류 루트 블록과 트리 버전이 자동으로 생성됩니다.',
    })
    @ApiCommonResponse(ExperienceMapResDTO)
    @ApiCommonErrorResponse(ErrorCode.UNAUTHORIZED)
    async getMap(@User('sub') userId: number): Promise<ExperienceMapResDTO> {
        return this.experienceMapFacade.getMap(userId);
    }

    @Post('blocks')
    @ApiOperation({
        summary: '블록 생성',
        description:
            'GROUP(루트), EXPERIENCE(GROUP/미분류 하위), CONTENT(SECTION 또는 CONTENT 하위)만 직접 생성할 수 있습니다. EXPERIENCE 생성 시 5개 고정 SECTION과 메타데이터가 함께 생성됩니다.',
    })
    @ApiCommonResponse(BlockResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_PARENT_NOT_FOUND,
        ErrorCode.BLOCK_INVALID_PLACEMENT,
        ErrorCode.BLOCK_CONTENT_TOO_LONG
    )
    async createBlock(
        @User('sub') userId: number,
        @Body() body: CreateBlockReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.createBlock(userId, body);
    }

    @Patch('blocks/:blockId')
    @ApiOperation({
        summary: '블록 내용 수정',
        description:
            '블록의 content를 수정합니다. 수정 불가능한 종류(SECTION 등)의 블록은 수정할 수 없습니다.',
    })
    @ApiCommonResponse(BlockResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_NOT_EDITABLE,
        ErrorCode.BLOCK_CONTENT_TOO_LONG
    )
    async updateBlockContent(
        @User('sub') userId: number,
        @Param('blockId') blockId: string,
        @Body() body: UpdateBlockContentReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.updateBlockContent(userId, blockId, body);
    }

    @Delete('blocks/:blockId')
    @ApiOperation({
        summary: '블록 삭제',
        description:
            '블록을 삭제합니다. 1단계(그룹) 블록은 하위 활동을 미분류로 옮긴 뒤 단독으로 삭제되고, 그 외 블록은 하위 블록과 함께 삭제됩니다. 삭제 불가능한 블록(미분류)은 삭제할 수 없습니다.',
    })
    @ApiCommonMessageResponse('블록이 성공적으로 삭제되었습니다.')
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_NOT_DELETABLE
    )
    async deleteBlock(
        @User('sub') userId: number,
        @Param('blockId') blockId: string
    ): Promise<string> {
        await this.experienceMapFacade.deleteBlock(userId, blockId);
        return '블록이 성공적으로 삭제되었습니다.';
    }

    @Patch('blocks/:blockId/position')
    @ApiOperation({
        summary: '블록 순서/위치 변경 (드래그 앤 드롭)',
        description:
            '블록의 형제 내 순서를 바꾸거나(parentId 생략), 다른 부모로 이동합니다. 1~2단계(그룹/활동)는 위계를 바꿀 수 없고 순서만 변경할 수 있습니다. 3~5단계는 3~5단계 내에서만 위계를 바꿀 수 있으며, 하위 블록도 함께 이동하고 이동 후 최대 5단계를 넘을 수 없습니다.',
    })
    @ApiCommonResponse(BlockResDTO)
    @ApiCommonErrorResponse(
        ErrorCode.UNAUTHORIZED,
        ErrorCode.BLOCK_NOT_FOUND,
        ErrorCode.BLOCK_PARENT_NOT_FOUND,
        ErrorCode.BLOCK_LEVEL_LOCKED,
        ErrorCode.BLOCK_INVALID_PLACEMENT
    )
    async moveBlock(
        @User('sub') userId: number,
        @Param('blockId') blockId: string,
        @Body() body: MoveBlockReqDTO
    ): Promise<BlockResDTO> {
        return this.experienceMapFacade.moveBlock(userId, blockId, body);
    }
}
