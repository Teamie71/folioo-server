import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/application/services/user.service';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { BlockService } from 'src/modules/block/application/services/block.service';
import { KakaoChannelLink } from '../../domain/kakao-channel-link.entity';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KakaoSkillReqDTO, KakaoSkillResDTO } from '../dtos/kakao-skill.dto';
import { KAKAO_MESSAGES } from '../kakao-messages';
import {
    activityQuickReplies,
    linkCardResponse,
    textCardResponse,
    textResponse,
} from '../kakao-skill-response';
import type { KakaoButton } from '../dtos/kakao-skill.dto';

export type ResolvedKakaoUser =
    | { kind: 'LINKED'; userId: number; link: KakaoChannelLink }
    | { kind: 'UNLINKED' }
    | { kind: 'PENDING' };

@Injectable()
export class KakaoSkillFacade {
    private readonly logger = new Logger(KakaoSkillFacade.name);

    constructor(
        private readonly userService: UserService,
        private readonly kakaoChannelLinkService: KakaoChannelLinkService,
        private readonly configService: ConfigService,
        private readonly blockService: BlockService
    ) {}

    // 스킬 응답은 항상 카카오 포맷이어야 하므로 예외도 안내 문구로 바꿔 돌려준다.
    async chat(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        const utterance = payload.userRequest?.utterance;
        if (typeof utterance === 'string' && utterance.trim() === '/활동변경') {
            return this.activities(payload);
        }
        try {
            const resolved = await this.resolveUser(
                payload.userRequest?.user?.properties?.appUserId
            );
            if (resolved.kind !== 'LINKED') {
                return this.guideCard(resolved.kind);
            }
            if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
                return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
            }
            if (resolved.link.hasDeletedActivity()) {
                return this.unavailableActivityResponse();
            }
            if (!resolved.link.currentBlockId) {
                return await this.activityListResponse(
                    resolved.userId,
                    KAKAO_MESSAGES.NEED_ACTIVITY,
                    true
                );
            }
            const activity = await this.blockService.findExperience(
                resolved.link.currentBlockId,
                resolved.userId
            );
            if (!activity) return this.unavailableActivityResponse();
            return textResponse(KAKAO_MESSAGES.NOT_READY);
        } catch (error) {
            this.logger.error('Kakao chat skill failed', error);
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    async activities(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        try {
            const resolved = await this.resolveUser(
                payload.userRequest?.user?.properties?.appUserId
            );
            if (resolved.kind !== 'LINKED') return this.guideCard(resolved.kind);
            if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
                return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
            }
            return await this.activityListResponse(resolved.userId);
        } catch (error) {
            this.logger.error('Kakao activities skill failed', error);
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    async selectActivity(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        try {
            const resolved = await this.resolveUser(
                payload.userRequest?.user?.properties?.appUserId
            );
            if (resolved.kind !== 'LINKED') return this.guideCard(resolved.kind);
            if (this.kakaoChannelLinkService.isTurnInProgress(resolved.link)) {
                return textResponse(KAKAO_MESSAGES.TURN_IN_PROGRESS);
            }
            const blockId = payload.action?.clientExtra?.block_id;
            if (
                typeof blockId !== 'string' ||
                !/^[1-9]\d{0,18}$/.test(blockId) ||
                BigInt(blockId) > 9223372036854775807n
            ) {
                return await this.invalidSelectionResponse(resolved.userId);
            }
            const activity = await this.blockService.findExperience(blockId, resolved.userId);
            if (!activity) return await this.invalidSelectionResponse(resolved.userId);
            await this.kakaoChannelLinkService.selectBlock(resolved.userId, activity.id);
            return textResponse(
                KAKAO_MESSAGES.ACTIVITY_SELECTED(
                    activity.content?.trim() ? activity.content : '이름 없는 활동'
                )
            );
        } catch (error) {
            this.logger.error('Kakao select-activity skill failed', error);
            return textResponse(KAKAO_MESSAGES.ERROR);
        }
    }

    // appUserId(카카오 앱 회원번호)로 Folioo 사용자를 찾는다.
    // 1) 연결 행 → 2) 카카오 가입자면 social_user(KAKAO)로 찾아 연결 행 자동 생성.
    // 탈퇴(비활성) 사용자의 연결은 지워서 같은 카카오 계정으로 재가입·재연결할 수 있게 한다.
    async resolveUser(appUserId: string | undefined): Promise<ResolvedKakaoUser> {
        if (!appUserId) {
            return { kind: 'UNLINKED' };
        }

        const link = await this.kakaoChannelLinkService.findByKakaoAppUserId(appUserId);
        if (link) {
            const user = await this.userService.findByIdOrThrow(link.userId);
            if (!user.isDeactivated()) {
                return this.toResolved(user, link);
            }
            await this.kakaoChannelLinkService.unlink(link.userId);
        }

        const kakaoUser = await this.userService.findByKakaoLoginId(appUserId);
        if (!kakaoUser || kakaoUser.isDeactivated()) {
            return { kind: 'UNLINKED' };
        }

        const createdLink = await this.kakaoChannelLinkService.link(kakaoUser.id, appUserId);
        return this.toResolved(kakaoUser, createdLink);
    }

    private toResolved(user: User, link: KakaoChannelLink): ResolvedKakaoUser {
        return user.status === UserStatus.PENDING
            ? { kind: 'PENDING' }
            : { kind: 'LINKED', userId: user.id, link };
    }

    private async activityListResponse(
        userId: number,
        description: string = KAKAO_MESSAGES.SELECT_ACTIVITY,
        needsSelection = false
    ): Promise<KakaoSkillResDTO> {
        const activities = await this.blockService.findRecentExperiences(userId);
        if (!activities.length) {
            return textCardResponse(KAKAO_MESSAGES.NO_ACTIVITY, [
                {
                    action: 'webLink',
                    label: '웹에서 활동 만들기',
                    webLinkUrl: this.configService.getOrThrow<string>(
                        'KAKAO_WEB_ACTIVITY_LIST_URL'
                    ),
                },
            ]);
        }
        const buttons: KakaoButton[] = [
            {
                action: 'webLink',
                label: '웹에서 활동 보기',
                webLinkUrl: this.configService.getOrThrow<string>('KAKAO_WEB_EXPERIENCE_URL'),
            },
        ];
        if (needsSelection)
            buttons.unshift({
                action: 'message',
                label: '활동 선택하기',
                messageText: '/활동변경',
            });
        return textCardResponse(
            description,
            buttons,
            activityQuickReplies(
                activities,
                this.configService.getOrThrow<string>('KAKAO_SELECT_ACTIVITY_BLOCK_ID')
            )
        );
    }

    private unavailableActivityResponse(): KakaoSkillResDTO {
        return textCardResponse(KAKAO_MESSAGES.ACTIVITY_NOT_FOUND, [
            {
                action: 'message',
                label: '활동 다시 선택',
                messageText: '/활동변경',
            },
        ]);
    }

    private async invalidSelectionResponse(userId: number): Promise<KakaoSkillResDTO> {
        const response = this.unavailableActivityResponse();
        const activities = await this.blockService.findRecentExperiences(userId);
        if (activities.length) {
            response.template.quickReplies = activityQuickReplies(
                activities,
                this.configService.getOrThrow<string>('KAKAO_SELECT_ACTIVITY_BLOCK_ID')
            );
        }
        return response;
    }

    private guideCard(kind: 'UNLINKED' | 'PENDING'): KakaoSkillResDTO {
        const webGuideUrl = this.configService.getOrThrow<string>('KAKAO_WEB_GUIDE_URL');
        return linkCardResponse(KAKAO_MESSAGES[kind], webGuideUrl);
    }
}
