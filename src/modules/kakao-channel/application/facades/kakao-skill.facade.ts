import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/modules/user/application/services/user.service';
import { UserStatus } from 'src/modules/user/domain/enums/user-status.enum';
import { User } from 'src/modules/user/domain/user.entity';
import { KakaoChannelLinkService } from '../services/kakao-channel-link.service';
import { KakaoSkillReqDTO, KakaoSkillResDTO } from '../dtos/kakao-skill.dto';
import { KAKAO_MESSAGES } from '../kakao-messages';
import { linkCardResponse, textResponse } from '../kakao-skill-response';

export type ResolvedKakaoUser =
    | { kind: 'LINKED'; userId: number }
    | { kind: 'UNLINKED' }
    | { kind: 'PENDING' };

@Injectable()
export class KakaoSkillFacade {
    private readonly logger = new Logger(KakaoSkillFacade.name);

    constructor(
        private readonly userService: UserService,
        private readonly kakaoChannelLinkService: KakaoChannelLinkService,
        private readonly configService: ConfigService
    ) {}

    // 스킬 응답은 항상 카카오 포맷이어야 하므로 예외도 안내 문구로 바꿔 돌려준다.
    async chat(payload: KakaoSkillReqDTO): Promise<KakaoSkillResDTO> {
        try {
            const resolved = await this.resolveUser(
                payload.userRequest?.user?.properties?.appUserId
            );
            if (resolved.kind !== 'LINKED') {
                return this.guideCard(resolved.kind);
            }
            return textResponse(KAKAO_MESSAGES.NOT_READY);
        } catch (error) {
            this.logger.error('Kakao chat skill failed', error);
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
                return this.toResolved(user);
            }
            await this.kakaoChannelLinkService.unlink(link.userId);
        }

        const kakaoUser = await this.userService.findByKakaoLoginId(appUserId);
        if (!kakaoUser || kakaoUser.isDeactivated()) {
            return { kind: 'UNLINKED' };
        }

        await this.kakaoChannelLinkService.link(kakaoUser.id, appUserId);
        return this.toResolved(kakaoUser);
    }

    private toResolved(user: User): ResolvedKakaoUser {
        return user.status === UserStatus.PENDING
            ? { kind: 'PENDING' }
            : { kind: 'LINKED', userId: user.id };
    }

    private guideCard(kind: 'UNLINKED' | 'PENDING'): KakaoSkillResDTO {
        const webGuideUrl = this.configService.getOrThrow<string>('KAKAO_WEB_GUIDE_URL');
        return linkCardResponse(KAKAO_MESSAGES[kind], webGuideUrl);
    }
}
