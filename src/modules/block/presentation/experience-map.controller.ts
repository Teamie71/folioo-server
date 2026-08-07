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
        ErrorCode.BLOCK_INVALID_PLACEMENT
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
        ErrorCode.BLOCK_NOT_EDITABLE
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
            '블록과 하위 블록을 모두 삭제합니다. 삭제 불가능한 종류(미분류, SECTION 등)의 블록은 삭제할 수 없습니다.',
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
}
